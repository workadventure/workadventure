import { ipcMain, app, desktopCapturer, shell } from "electron";
import ElectronLog from "electron-log";
import electronIsDev from "electron-is-dev";
import path from "path";
import { pathToFileURL } from "url";
import { ensureWorldOriginTrusted, getDesktopConfig, originUserMayTrust, trustServer } from "./origin-verification";
import settings from "./settings";
import { setKeepAwake, setUnreadCount, showNotification, type ShowNotificationOptions } from "./system-integration";
import { notePresenceReport, setRendererPresence } from "./presence";
import { closeCompanionPip, dismissCompanion, onMainWindowHidden, openCompanionForPip } from "./companion-controller";
import {
    getControllingWorldContents,
    getDesktopWindowState,
    getWindow,
    isActiveWorldContents,
    isControllingWorldContents,
    loadDesktopTarget,
    switchToOpenWorld,
    openWorldTab,
} from "./window";
import { activateTab, closeTab, getTabs, isWorldContents, setActiveWorldTitle, setTabInMeeting } from "./tab-manager";
import { isTabStripSender, markTabStripReady, setTabStripVisible } from "./tab-strip";
import { isAllowedNavigationUrl, validateDesktopNavigationUrl } from "./desktop-url-policy";
import { isPipWindowOpen, sendToPip } from "./pip-window";
import {
    broadcastHudState,
    closeHudWindow,
    getHudWindow,
    hudKindOfSender,
    isHudSender,
    markHudReady,
    openHudWindow,
    sendHudState,
    setHudStrings,
    setMeetingBarExpanded,
} from "./hud-windows";
import { nativeStrings, t } from "./i18n";
import { sanitizeStringTable } from "./native-locale-policy";
import { getPinnedWorlds, getRecentWorlds, isWorldPinned, toggleWorldPin } from "./world-history";
import { handleScreenIdentifyCancel, handleScreenIdentifyPick, identifyScreens } from "./screen-identify";

const DEFAULT_ADMIN_SIGNUP_URL = "https://admin.workadventu.re/funnel/connection";
// Compared on pathname only — the actual sender URL may carry a `?error=…` query when we bounce
// back to Landing after a failed navigation, and we still want that page to keep its IPC access.
const NATIVE_LANDING_PATHNAME = pathToFileURL(
    path.resolve(__dirname, "..", "assets", "landing", "index.html")
).pathname;

function getAdminSignupUrl(): string {
    return process.env.WA_DESKTOP_ADMIN_SIGNUP_URL || DEFAULT_ADMIN_SIGNUP_URL;
}

const DESKTOP_CAPTURER_ALLOWED_TYPES = new Set(["screen", "window"]);
const DESKTOP_CAPTURER_MAX_THUMBNAIL = { width: 320, height: 180 };
const DESKTOP_CAPTURER_MIN_INTERVAL_MS = 250;

type CapturerCacheEntry = {
    at: number;
    result: Array<{ id: string; name: string; thumbnailURL: string; display_id?: number }>;
};
const desktopCapturerCacheByFrame = new Map<string, CapturerCacheEntry>();
let pipOwner: Electron.WebContents | undefined;

const keepAwakeByTab = new Map<number, number>();
const unreadByTab = new Map<number, number>();

function sumOf(values: Map<number, number>): number {
    let total = 0;
    for (const value of values.values()) {
        total += value;
    }
    return total;
}

function applyKeepAwake(): void {
    setKeepAwake(sumOf(keepAwakeByTab) > 0);
}

function applyUnreadCount(): void {
    setUnreadCount(sumOf(unreadByTab), getWindow() ?? undefined);
}

function trackPerTab(
    values: Map<number, number>,
    contents: Electron.WebContents,
    value: number,
    apply: () => void
): void {
    if (!values.has(contents.id)) {
        const id = contents.id;
        contents.once("destroyed", () => {
            values.delete(id);
            apply();
        });
    }
    values.set(contents.id, value);
    apply();
}

// Companion windows we've already wired the "closed → tell the WA renderer to stop the PiP" hook to.
// The companion outlives a single meeting (it stays open on People after a call ends), so app:pip:open
// can fire several times against the same window — this keeps exactly one close listener per window.
const pipClosedHookWired = new WeakSet<Electron.BrowserWindow>();

function clampThumbnailSize(value: unknown): { width: number; height: number } {
    const fallback = DESKTOP_CAPTURER_MAX_THUMBNAIL;
    if (!value || typeof value !== "object") {
        return fallback;
    }
    const candidate = value as { width?: unknown; height?: unknown };
    const width = Math.max(1, Math.min(Number(candidate.width) || fallback.width, fallback.width));
    const height = Math.max(1, Math.min(Number(candidate.height) || fallback.height, fallback.height));
    return { width, height };
}

type AllowedSourceType = "screen" | "window";

function sanitizeDesktopCapturerOptions(options: unknown): Electron.SourcesOptions {
    const raw = (options || {}) as { types?: unknown; thumbnailSize?: unknown };
    const types: AllowedSourceType[] = Array.isArray(raw.types)
        ? raw.types.filter(
              (t): t is AllowedSourceType => typeof t === "string" && DESKTOP_CAPTURER_ALLOWED_TYPES.has(t)
          )
        : [];
    return {
        types: types.length > 0 ? types : ["screen", "window"],
        thumbnailSize: clampThumbnailSize(raw.thumbnailSize),
    };
}

/** Map a `screen:<id>:<n>` desktopCapturer source to its Electron Display.id, so the meeting bar
 * goes on the screen that is actually being shared. */
async function resolveDisplayIdFromScreenSource(sourceId: string): Promise<number | undefined> {
    try {
        const sources = await desktopCapturer.getSources({ types: ["screen"] });
        const match = sources.find((source) => source.id === sourceId);
        if (match && match.display_id) {
            const fromDisplayId = Number(match.display_id);
            if (!Number.isNaN(fromDisplayId)) {
                return fromDisplayId;
            }
        }
    } catch (error) {
        ElectronLog.debug("resolveDisplayIdFromScreenSource getSources failed", error);
    }
    // Fallback: parse the numeric display id out of `screen:<DISPLAY_ID>:<index>`.
    const parsed = /^screen:(\d+):/.exec(sourceId);
    return parsed ? Number(parsed[1]) : undefined;
}

export function emitMuteToggle() {
    // Toggle mic in the on-screen world (only it captures media).
    getControllingWorldContents()?.send("app:on-mute-toggle");
}

export function emitCameraToggle() {
    getControllingWorldContents()?.send("app:on-camera-toggle");
}

/** Ask the active world to change the user's availability status (from the tray Status submenu). */
export function emitSetStatus(status: "online" | "busy" | "back_in_a_moment" | "do_not_disturb") {
    getControllingWorldContents()?.send("app:on-set-status", status);
}

function normalizeNotifyPayload(payload: unknown): ShowNotificationOptions | undefined {
    if (typeof payload === "string") {
        const title = payload.trim();
        return title ? { title, body: "" } : undefined;
    }
    if (payload && typeof payload === "object") {
        const raw = payload as Record<string, unknown>;
        const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : "WorkAdventure";
        const body = typeof raw.body === "string" ? raw.body.trim() : "";
        // A notification needs at least a title. Body may be empty (short "Follow request from
        // Alice"-style alerts where the whole message fits into the title).
        if (!title && !body) {
            return undefined;
        }
        return {
            title,
            body,
            tag: typeof raw.tag === "string" && raw.tag ? raw.tag : undefined,
            silent: Boolean(raw.silent),
        };
    }
    return undefined;
}

export default () => {
    ipcMain.handle("is-development", () => electronIsDev);
    ipcMain.handle("get-version", () => (electronIsDev ? "dev" : app.getVersion()));
    ipcMain.handle("app:getWindowState", () => getDesktopWindowState());

    // app ipc
    ipcMain.on("app:notify", (event, payload: unknown) => {
        // Accept both the legacy plain-string form (`notify(body)`) and the enriched object form
        // (`notify({title, body, tag, silent})`). Anything else is ignored — the renderer
        // typedef gates this at compile time, but we still guard so a mis-wired call from an
        // untyped surface doesn't crash the main process.
        const options = normalizeNotifyPayload(payload);
        if (!options) {
            return;
        }
        // The click belongs to the world that raised the notification, which may be a background tab.
        const sender = event.sender;
        showNotification(options, (tag) => {
            const mainWindow = getWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            }
            const tab = getTabs().find((candidate) => candidate.view.webContents === sender);
            if (!tab || sender.isDestroyed()) {
                return;
            }
            activateTab(tab.id);
            sender.send("app:on-notification-click", tag ?? "");
        });
    });

    // Keep-awake and the unread badge aggregate every tab: a meeting in a background tab still needs
    // the display on, and each tab must be able to release what it asked for even once it is no
    // longer the active one (otherwise the blocker outlives the meeting). A closed tab's renderer
    // drops its entry.
    ipcMain.on("app:setKeepAwake", (event, enabled: unknown) => {
        if (!isWorldContents(event.sender)) {
            return;
        }
        trackPerTab(keepAwakeByTab, event.sender, enabled ? 1 : 0, applyKeepAwake);
    });

    ipcMain.on("app:setUnreadCount", (event, count: unknown) => {
        if (!isWorldContents(event.sender)) {
            return;
        }
        const parsed = typeof count === "number" && Number.isFinite(count) ? Math.max(0, count) : 0;
        trackPerTab(unreadByTab, event.sender, parsed, applyUnreadCount);
    });

    ipcMain.on("app:setPresence", (event, presence: unknown) => {
        if (!isWorldContents(event.sender) || !presence || typeof presence !== "object") {
            return;
        }
        notePresenceReport(event.sender.id);
        const raw = presence as Record<string, unknown>;
        // Every tab reports whether it is in a meeting: that decides which tab drives media. One
        // meeting at a time: the tab that was in one drops its mic, camera and screen share (they are
        // not turned back on by themselves), and the one entering tells the user.
        const preempted = setTabInMeeting(event.sender, Boolean(raw.inMeeting));
        if (preempted && !preempted.view.webContents.isDestroyed()) {
            preempted.view.webContents.send("app:on-media-preempted");
            event.sender.send("app:on-other-meeting-muted", preempted.appTitle || preempted.urlLabel);
        }
        if (!isFromMainRenderer(event)) {
            return;
        }
        setRendererPresence({
            inMeeting: Boolean(raw.inMeeting),
            micEnabled: Boolean(raw.micEnabled),
            cameraEnabled: Boolean(raw.cameraEnabled),
            screenSharing: Boolean(raw.screenSharing),
            inWorld: Boolean(raw.inWorld),
            onboarding: Boolean(raw.onboarding),
            invitationPending: Boolean(raw.invitationPending),
            requestedStatus: raw.requestedStatus,
            statusLocked: Boolean(raw.statusLocked),
        });
    });

    // The world page went hidden: the window was fully covered or minimized (the browser engine
    // tracks occlusion on macOS and Windows). Only the visible tab counts, background tabs are hidden.
    ipcMain.on("app:page-hidden", (event) => {
        if (isFromActiveRenderer(event)) {
            onMainWindowHidden();
        }
    });

    ipcMain.on("app:setTabTitle", (event, title: unknown) => {
        if (!isFromActiveRenderer(event) || typeof title !== "string") {
            return;
        }
        setActiveWorldTitle(title);
    });

    ipcMain.handle("app:getDesktopCapturerSources", async (event, options: unknown) => {
        const config = getDesktopConfig();
        const senderFrame = event.senderFrame;
        const senderUrl = senderFrame?.url ?? "";
        // Refuse: missing frame, sub-frame (iframe), or frame not on an allow-listed origin.
        // Without this, ANY iframe loaded inside the renderer can silently enumerate screens/windows.
        if (!senderFrame || senderFrame.parent !== null || !isAllowedNavigationUrl(senderUrl, config)) {
            ElectronLog.warn(`Rejected desktopCapturer request from disallowed frame "${senderUrl}".`);
            return [];
        }

        const frameKey = `${event.sender.id}:${senderFrame.routingId}`;
        const now = Date.now();
        const cached = desktopCapturerCacheByFrame.get(frameKey);
        // Throttle repeat calls but serve the last-known list instead of a silent empty array.
        // The picker polls once per second and re-mounts on the user's second attempt land inside
        // the throttle window: returning [] then would show "no sources" even though the sources
        // are readily available.
        if (cached && now - cached.at < DESKTOP_CAPTURER_MIN_INTERVAL_MS) {
            return cached.result;
        }

        const sanitized = sanitizeDesktopCapturerOptions(options);
        const sources = await desktopCapturer.getSources(sanitized);
        const result = sources.map((source) => ({
            id: source.id,
            name: source.name,
            thumbnailURL: source.thumbnail.toDataURL(),
            // Electron exposes display_id (as a string) for screen sources; used to place the
            // meeting bar on the correct display.
            display_id: source.display_id ? Number(source.display_id) : undefined,
        }));
        // Entries only serve the throttle window: drop the stale ones (frames of closed tabs and
        // reloads would otherwise keep their thumbnail data URLs forever).
        for (const [key, entry] of desktopCapturerCacheByFrame) {
            if (now - entry.at >= DESKTOP_CAPTURER_MIN_INTERVAL_MS) {
                desktopCapturerCacheByFrame.delete(key);
            }
        }
        desktopCapturerCacheByFrame.set(frameKey, { at: Date.now(), result });
        return result;
    });

    // "Identify screens": pop a big-numbered, click-to-share overlay on every physical display and
    // resolve the screen source the user clicks (null on Escape) — so a screen can be picked by
    // clicking it directly instead of matching thumbnails. Only the active world renderer (the
    // screen-share picker) may start it; the overlay windows themselves raise :pick / :cancel over
    // their own preload (window.WAScreenPick), so those two are not gated on the main renderer.
    ipcMain.handle("app:screen-identify:start", (event) => {
        if (!isFromActiveRenderer(event)) {
            ElectronLog.warn("Rejected screen-identify request from non-main renderer");
            return null;
        }
        return identifyScreens();
    });
    ipcMain.on("app:screen-identify:pick", (event) => {
        // The sender is one of the overlay windows; the module maps its webContents id → display.
        handleScreenIdentifyPick(event.sender.id);
    });
    ipcMain.on("app:screen-identify:cancel", () => {
        handleScreenIdentifyCancel();
    });

    // ---- Desktop navigation (first-launch Landing + in-game world switcher) ----
    // Validate a user-supplied world URL before handing it to the main window. This gives both
    // UIs a useful error instead of silently falling back to the portal.
    ipcMain.handle("app:navigation:joinWorld", async (event, rawUrl: unknown) => {
        if (!isFromActiveRenderer(event)) {
            ElectronLog.warn("Rejected world navigation from non-main renderer");
            return { ok: false, error: t("landing.desktopOnly") };
        }
        const config = getDesktopConfig();
        let validation = validateDesktopNavigationUrl(rawUrl, config);
        // A white-label world: the URL is fine but its origin is not built in, ask the portal's admin.
        if (!validation.ok && validation.code === "urlNotAllowed" && typeof rawUrl === "string") {
            if (await ensureWorldOriginTrusted(rawUrl.trim())) {
                validation = validateDesktopNavigationUrl(rawUrl, getDesktopConfig());
            }
        }
        if (!validation.ok) {
            // Unknown to the admin too (a self-hosted server): the native Landing may offer to add it.
            // Never a world page (the in-game switcher): a world must not be able to add servers.
            const trustOrigin =
                validation.code === "urlNotAllowed" && typeof rawUrl === "string" && isFromNativeLanding(event)
                    ? originUserMayTrust(rawUrl)
                    : undefined;
            return { ok: false, error: t(`landing.${validation.code}`), trustOrigin };
        }
        const safeUrl = validation.url;
        if (switchToOpenWorld(safeUrl, event.sender)) {
            return { ok: true };
        }
        try {
            const loaded = await loadDesktopTarget(safeUrl);
            return loaded ? { ok: true } : { ok: false, error: t("landing.worldNotLoaded") };
        } catch (error) {
            ElectronLog.error(`app:navigation:joinWorld failed for ${safeUrl}`, error);
            return { ok: false, error: error instanceof Error ? error.message : t("landing.joinFailed") };
        }
    });

    // The user confirmed, on the native Landing, to add a server the admin does not know (self-hosted).
    ipcMain.handle("app:navigation:trustServerAndJoin", async (event, rawUrl: unknown) => {
        if (!isFromNativeLanding(event) || typeof rawUrl !== "string") {
            ElectronLog.warn("Rejected a server trust request from outside the native landing page");
            return { ok: false, error: t("landing.desktopOnly") };
        }
        if (!trustServer(rawUrl.trim())) {
            return { ok: false, error: t("landing.urlNotAllowed") };
        }
        const validation = validateDesktopNavigationUrl(rawUrl, getDesktopConfig());
        if (!validation.ok) {
            return { ok: false, error: t(`landing.${validation.code}`) };
        }
        if (switchToOpenWorld(validation.url, event.sender)) {
            return { ok: true };
        }
        try {
            const loaded = await loadDesktopTarget(validation.url);
            return loaded ? { ok: true } : { ok: false, error: t("landing.worldNotLoaded") };
        } catch (error) {
            ElectronLog.error(`app:navigation:trustServerAndJoin failed for ${validation.url}`, error);
            return { ok: false, error: t("landing.joinFailed") };
        }
    });

    ipcMain.handle("app:navigation:getRecentWorlds", (event) => {
        if (!isFromNativeLanding(event)) {
            ElectronLog.warn("Rejected recent worlds request from outside the native landing page");
            return [];
        }
        return getRecentWorlds();
    });

    ipcMain.handle("app:navigation:getPinnedWorlds", (event) => {
        // Pinned worlds are shown on the native Landing and in the in-game switcher, both of which
        // run in the main renderer.
        if (!isFromActiveRenderer(event)) {
            ElectronLog.warn("Rejected pinned worlds request from non-main renderer");
            return [];
        }
        return getPinnedWorlds();
    });

    ipcMain.handle("app:navigation:togglePin", (event, rawUrl: unknown) => {
        if (!isFromActiveRenderer(event)) {
            ElectronLog.warn("Rejected pin toggle from non-main renderer");
            return { ok: false, error: t("landing.desktopOnly") };
        }
        if (typeof rawUrl !== "string" || !rawUrl.trim()) {
            return { ok: false, error: "A world URL is required." };
        }
        const pinned = toggleWorldPin(rawUrl);
        return { ok: true, pinned };
    });

    ipcMain.handle("app:navigation:isPinned", (event, rawUrl: unknown) => {
        if (!isFromActiveRenderer(event) || typeof rawUrl !== "string") {
            return false;
        }
        return isWorldPinned(rawUrl);
    });

    // ---- Tab strip ----
    // All tab operations must originate from the strip's own webContents (the only holder of the
    // preload-tabs script), so no world page can spawn/close tabs on its own.
    ipcMain.on("app:tabs:ready", (event) => {
        markTabStripReady(event.sender);
    });
    // Native pages' strings, in the OS language. Synchronous IPC: returnValue must ALWAYS be set,
    // otherwise the calling page stays blocked.
    ipcMain.on("app:i18n:tabs", (event) => {
        event.returnValue = isTabStripSender(event.sender) ? nativeStrings("tabs.") : null;
    });
    ipcMain.on("app:i18n:landing", (event) => {
        event.returnValue = isFromNativeLanding(event) ? nativeStrings("landing.") : null;
    });
    ipcMain.on("app:tabs:new", (event) => {
        if (!isTabStripSender(event.sender)) {
            return;
        }
        void openWorldTab();
    });
    ipcMain.on("app:tabs:activate", (event, id: unknown) => {
        if (!isTabStripSender(event.sender) || typeof id !== "string") {
            return;
        }
        activateTab(id);
    });
    ipcMain.on("app:tabs:close", (event, id: unknown) => {
        if (!isTabStripSender(event.sender) || typeof id !== "string") {
            return;
        }
        closeTab(id);
    });

    ipcMain.handle("app:navigation:openAdminSignup", async (event) => {
        if (!isFromActiveRenderer(event)) {
            ElectronLog.warn("Rejected admin signup navigation from non-main renderer");
            return { ok: false, error: t("landing.desktopOnly") };
        }
        const url = getAdminSignupUrl();
        try {
            await shell.openExternal(url);
            return { ok: true };
        } catch (error) {
            ElectronLog.error(`Failed to open admin signup URL ${url}`, error);
            return { ok: false, error: t("landing.signupFailed") };
        }
    });

    // ---- Picture-in-Picture (native utility window) ----
    // The PiP utility window is a frameless, always-on-top BrowserWindow that mirrors video tracks
    // from the main renderer via a renderer↔renderer RTCPeerConnection. All SDP/ICE signalling is
    // relayed through the main process; no external network is involved.
    // "The main renderer" is now the ACTIVE world view (the on-screen tab). Media / PiP / presence
    // / presenter / navigation IPC is only honoured from the foreground world; a backgrounded tab
    // must not drive the tray, PiP or capture. Window operations still use getWindow() (the shell).
    // Media / PiP / presence / presenter IPC follows the tab that drives media (the one in a meeting,
    // else the active one: see tab-manager); navigation IPC is the on-screen tab's.
    function isFromMainRenderer(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean {
        return isControllingWorldContents(event.sender);
    }

    function isFromActiveRenderer(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean {
        return isActiveWorldContents(event.sender);
    }

    function isFromNativeLanding(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean {
        if (!isFromActiveRenderer(event) || event.senderFrame?.parent !== null) {
            return false;
        }
        try {
            const senderUrl = new URL(event.senderFrame.url);
            return senderUrl.protocol === "file:" && senderUrl.pathname === NATIVE_LANDING_PATHNAME;
        } catch {
            return false;
        }
    }

    ipcMain.handle("app:pip:open", async (event) => {
        if (!isFromMainRenderer(event)) {
            ElectronLog.warn("Rejected PiP open from non-main renderer");
            return false;
        }
        // The meeting video renders as HTML <video> tiles inside the companion window. Ensure the
        // companion is open and its renderer is ready (openCompanionForPip awaits hud-ready) before
        // the WA renderer starts sending its SDP offer — otherwise the first offer lands in a deaf
        // renderer and tracks only start mirroring on the next store change (someone joining/leaving).
        await openCompanionForPip();
        // The window closes asynchronously, possibly after a tab switch: tell the world that opened the
        // PiP, not whichever tab is active by then.
        pipOwner = event.sender;
        const companion = getHudWindow("companion");
        if (companion && !pipClosedHookWired.has(companion)) {
            pipClosedHookWired.add(companion);
            // Mirror the old PiP window's onClosed: if the user closes the companion (its host) while
            // the call is live, tell the WA renderer to tear its side down too. stop() is idempotent,
            // so a late fire after the meeting already ended is harmless.
            companion.once("closed", () => {
                if (pipOwner && !pipOwner.isDestroyed()) {
                    pipOwner.send("app:pip:closed");
                }
                // A companion reopened in the meantime hosts a new PiP: this late close is not about it.
                const current = getHudWindow("companion");
                if (!current || current === companion || current.isDestroyed()) {
                    closeCompanionPip();
                }
            });
        }
        return isPipWindowOpen();
    });

    // Close requests are honoured from the foreground world only, like the opens: a background tab
    // whose own meeting ends must not tear down the windows the active tab is using.
    ipcMain.handle("app:pip:close", (event) => {
        if (!isFromMainRenderer(event)) return;
        // Tear down the companion's meeting peer connection + tiles, then drop the keep-open and
        // re-evaluate the panel's visibility (it stays open on People if WA is still backgrounded).
        sendToPip("app:pip:close");
        closeCompanionPip();
    });

    // Main renderer → companion renderer (the meeting-video peer lives in the companion)
    ipcMain.on("app:pip:offer-from-main", (event, sdp: unknown) => {
        if (!isFromMainRenderer(event) || !isPipWindowOpen()) return;
        sendToPip("app:pip:offer", sdp);
    });
    ipcMain.on("app:pip:ice-from-main-renderer", (event, candidate: unknown) => {
        if (!isFromMainRenderer(event) || !isPipWindowOpen()) return;
        sendToPip("app:pip:ice-from-main", candidate);
    });

    // Companion renderer → main renderer (relayed by main process, to the active world view). Both
    // are sender-validated: the answer/ICE can only originate from the companion window (the sole
    // holder of the WAHud meeting bridge), never from arbitrary web content.
    ipcMain.on("app:pip:answer", (event, sdp: unknown) => {
        if (hudKindOfSender(event.sender) !== "companion") return;
        getControllingWorldContents()?.send("app:pip:answer-to-main", sdp);
    });
    ipcMain.on("app:pip:ice-from-pip", (event, candidate: unknown) => {
        if (hudKindOfSender(event.sender) !== "companion") return;
        getControllingWorldContents()?.send("app:pip:ice-to-main", candidate);
    });

    // Main renderer pushes tile metadata + device state (mic/cam/screenshare) to the companion
    // renderer, which drives the meeting tiles. Validated: state can only originate from the main
    // renderer, and it is only forwarded while the companion (the meeting-video host) is open.
    ipcMain.on("app:pip:state-from-main", (event, state: unknown) => {
        if (!isFromMainRenderer(event) || !isPipWindowOpen()) return;
        sendToPip("app:pip:state-to-pip", state);
    });

    // ---- Presenter HUD (meeting bar) ----
    // A content-protected floating window placed on the SHARED display: the presenter sees it,
    // the captured stream does not. State is pushed from the main renderer; user actions
    // come back as commands (same union as the PiP commands).
    async function resolveHudDisplayId(opts: unknown): Promise<number | undefined> {
        const options = (opts && typeof opts === "object" ? opts : {}) as { displayId?: unknown; sourceId?: unknown };
        let displayId = typeof options.displayId === "number" ? options.displayId : undefined;
        if (displayId === undefined && typeof options.sourceId === "string" && options.sourceId.startsWith("screen:")) {
            displayId = await resolveDisplayIdFromScreenSource(options.sourceId);
        }
        return displayId;
    }

    ipcMain.handle("app:hud:open-meeting-bar", async (event, opts: unknown) => {
        if (!isFromMainRenderer(event)) {
            ElectronLog.warn("Rejected meeting-bar open from non-main renderer");
            return false;
        }
        return openHudWindow("meeting-bar", await resolveHudDisplayId(opts));
    });
    ipcMain.handle("app:hud:close-meeting-bar", (event) => {
        if (!isFromMainRenderer(event)) return;
        closeHudWindow("meeting-bar");
    });

    // Main renderer → HUD windows
    ipcMain.on("app:hud:state-from-main", (event, state: unknown) => {
        if (!isFromMainRenderer(event)) return;
        // Inject the tab-strip state (a main-process setting, not known to the front) so the meeting
        // bar's "Display tabs" toggle reflects reality.
        const augmented =
            state && typeof state === "object"
                ? { ...(state as Record<string, unknown>), tabBarEnabled: settings.get("tab_bar_enabled") !== false }
                : state;
        broadcastHudState(augmented);
    });

    // Main renderer → companion panel. Separate channel/state from the presenter bars (different
    // shape); sendHudState targets only the companion window and replays on (re)open.
    ipcMain.on("app:companion:state-from-main", (event, state: unknown) => {
        if (!isFromMainRenderer(event)) return;
        sendHudState("companion", state);
    });

    // Main renderer → companion + meeting bar strings, translated by the world in the language the
    // user chose in WorkAdventure. Kept and replayed to each HUD window when it becomes ready.
    ipcMain.on("app:hud:strings-from-main", (event, strings: unknown) => {
        if (!isFromMainRenderer(event)) return;
        const table = sanitizeStringTable(strings);
        if (!table) {
            ElectronLog.warn("Rejected a malformed HUD string table");
            return;
        }
        setHudStrings(table);
    });

    // HUD windows → main renderer
    ipcMain.on("app:hud:command-from-hud", (event, command: unknown) => {
        if (!isHudSender(event.sender)) return;
        const type = command !== null && typeof command === "object" ? (command as { type?: unknown }).type : undefined;
        // `focus-main` is handled directly in the main process, like the PiP command.
        if (type === "focus-main") {
            const mainWindow = getWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (mainWindow.isMinimized()) {
                    mainWindow.restore();
                }
                mainWindow.show();
                mainWindow.focus();
            }
            return;
        }
        // Meeting bar "Display tabs": toggle the tab strip (a main-process setting). Non-destructive —
        // it only shows/hides the strip; the native menu keeps the multi-tab confirmation flow.
        if (type === "toggle-tabs") {
            const enabled = settings.get("tab_bar_enabled") !== false;
            settings.set("tab_bar_enabled", !enabled);
            setTabStripVisible(!enabled);
            return;
        }
        // The companion panel is main-managed (not tied to the screen-share PresenterHud bridge):
        // mic/camera toggles and "close" are handled here (mic/cam via the same path the global
        // shortcuts use, reliable whether or not a screen share is active); everything else (status,
        // chat, per-user actions, screen-share) is forwarded to the active world renderer.
        if (hudKindOfSender(event.sender) === "companion") {
            if (type === "toggle-mic") {
                emitMuteToggle();
            } else if (type === "toggle-camera") {
                emitCameraToggle();
            } else if (type === "close") {
                // If a meeting video is running in the companion, tell the WA renderer to tear its
                // PiP side down too before we dismiss (mirrors the old PiP window's close). stop() is
                // idempotent, so this is a no-op when no call is active.
                getControllingWorldContents()?.send("app:pip:closed");
                // Go through the controller so the dismissal sticks (force-closed), instead of a bare
                // close that would re-open on the next presence change.
                dismissCompanion();
            } else {
                getControllingWorldContents()?.send("app:companion:command-to-main", command);
            }
            return;
        }
        getControllingWorldContents()?.send("app:hud:command-to-main", command);
    });

    // Source enumeration for the meeting bar's direct screen switcher. Sender-validated: only the
    // HUD windows hold the preload-hud script, so no third party can reach this handler.
    ipcMain.handle("app:hud:request-sources", async (event) => {
        if (!isHudSender(event.sender)) {
            ElectronLog.warn("Rejected app:hud:request-sources from a non-HUD renderer");
            return [];
        }
        const sources = await desktopCapturer.getSources({
            types: ["screen", "window"],
            thumbnailSize: { width: 320, height: 180 },
        });
        return sources.map((source) => ({
            id: source.id,
            name: source.name,
            thumbnailURL: source.thumbnail.toDataURL(),
            type: source.id.startsWith("window:") ? "window" : "screen",
            display_id: source.display_id ? Number(source.display_id) : undefined,
        }));
    });

    ipcMain.on("app:hud:set-expanded", (event, payload: unknown) => {
        // Back-compat: the renderer used to send a bare boolean; it now sends { expanded, height }.
        const raw = (payload && typeof payload === "object" ? payload : { expanded: payload }) as {
            expanded?: unknown;
            height?: unknown;
        };
        const height = typeof raw.height === "number" ? raw.height : undefined;
        setMeetingBarExpanded(event.sender, raw.expanded === true, height);
    });
    ipcMain.on("app:hud:ready", (event) => {
        markHudReady(event.sender);
    });
};
