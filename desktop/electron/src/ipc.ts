import { ipcMain, app, desktopCapturer, shell } from "electron";
import ElectronLog from "electron-log";
import electronIsDev from "electron-is-dev";
import path from "path";
import { pathToFileURL } from "url";
import settings from "./settings";
import { loadShortcuts, setShortcutsEnabled } from "./shortcuts";
import { setKeepAwake, setUnreadCount, showNotification, type ShowNotificationOptions } from "./system-integration";
import { setRendererPresence } from "./presence";
import { startPresenterCursor, stopPresenterCursor } from "./presenter-cursor";
import {
    getActiveWorldContents,
    getDesktopWindowState,
    getWindow,
    isActiveWorldContents,
    loadDesktopTarget,
    openWorldTab,
} from "./window";
import { activateTab, closeTab, setActiveWorldTitle } from "./tab-manager";
import { isTabStripSender, markTabStripReady } from "./tab-strip";
import { createDesktopConfig, isAllowedNavigationUrl, validateDesktopNavigationUrl } from "./desktop-url-policy";
import {
    awaitPipReady,
    closePipWindow,
    createPipWindow,
    getPipWindow,
    isPipWindowOpen,
    markPipReady,
    sendToPip,
} from "./pip-window";
import {
    awaitOverlayReady,
    closeOverlayWindow,
    createOverlayWindow,
    getOverlayWindow,
    isOverlayWindowOpen,
    markOverlayReady,
    sendToOverlay,
    setOverlayDrawMode,
} from "./overlay-window";
import { handleScreenIdentifyCancel, handleScreenIdentifyPick, identifyScreens } from "./screen-identify";
import {
    broadcastHudState,
    closeHudWindow,
    hudKindOfSender,
    isHudSender,
    markHudReady,
    openHudWindow,
    setMeetingBarExpanded,
} from "./hud-windows";
import { getPinnedWorlds, getRecentWorlds, isWorldPinned, toggleWorldPin } from "./world-history";

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

/** Map a `screen:<id>:<n>` desktopCapturer source to its Electron Display.id, so the annotation
 * overlay covers the screen that is actually being shared. */
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
    getActiveWorldContents()?.send("app:on-mute-toggle");
}

export function emitCameraToggle() {
    getActiveWorldContents()?.send("app:on-camera-toggle");
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
        showNotification(options, (tag) => {
            const mainWindow = getWindow();
            if (mainWindow && !mainWindow.isDestroyed()) {
                if (mainWindow.isMinimized()) mainWindow.restore();
                mainWindow.show();
                mainWindow.focus();
            }
            getActiveWorldContents()?.send("app:on-notification-click", tag ?? "");
        });
    });

    ipcMain.on("app:setKeepAwake", (event, enabled: unknown) => {
        if (!isFromMainRenderer(event)) {
            return;
        }
        setKeepAwake(Boolean(enabled));
    });

    ipcMain.on("app:setUnreadCount", (event, count: unknown) => {
        if (!isFromMainRenderer(event)) {
            return;
        }
        const parsed = typeof count === "number" && Number.isFinite(count) ? count : 0;
        setUnreadCount(parsed, getWindow() ?? undefined);
    });

    ipcMain.on("app:setPresence", (event, presence: unknown) => {
        if (!isFromMainRenderer(event) || !presence || typeof presence !== "object") {
            return;
        }
        const raw = presence as Record<string, unknown>;
        setRendererPresence({
            inMeeting: Boolean(raw.inMeeting),
            micEnabled: Boolean(raw.micEnabled),
            cameraEnabled: Boolean(raw.cameraEnabled),
            screenSharing: Boolean(raw.screenSharing),
        });
    });

    ipcMain.on("app:setTabTitle", (event, title: unknown) => {
        if (!isFromMainRenderer(event) || typeof title !== "string") {
            return;
        }
        setActiveWorldTitle(title);
    });

    // Presenter tools: start/stop global cursor tracking over the shared display. When a tool is
    // active, main polls the cursor and streams normalized positions back to the renderer, which
    // broadcasts them to viewers over the space. tool === "none" (or empty) stops tracking.
    ipcMain.on("app:presenter:setTool", (event, payload: unknown) => {
        if (!isFromMainRenderer(event)) {
            return;
        }
        const raw = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
        const tool = typeof raw.tool === "string" ? raw.tool : "none";
        const sourceId = typeof raw.sourceId === "string" ? raw.sourceId : undefined;
        if (tool !== "laser" && tool !== "spotlight" && tool !== "loupe") {
            stopPresenterCursor();
            sendToOverlay("app:overlay:presenter-effect", { tool: "none", x: 0, y: 0, scale: 0, active: false });
            return;
        }
        void (async () => {
            let displayId = typeof raw.displayId === "number" ? raw.displayId : undefined;
            // Resolve the display from the capture source when display_id is missing (e.g. Wayland),
            // so the cursor is normalized against the SHARED screen, not the primary one.
            if (displayId === undefined && sourceId && sourceId.startsWith("screen:")) {
                displayId = await resolveDisplayIdFromScreenSource(sourceId);
            }
            startPresenterCursor(displayId, (x, y) => {
                // → the world renderer, which broadcasts to viewers over the space.
                getActiveWorldContents()?.send("app:on-presenter-cursor", { x, y });
                // → the content-protected overlay, so the PRESENTER sees the effect locally over
                // the shared app (not captured, so viewers don't get a doubled render).
                sendToOverlay("app:overlay:presenter-effect", { tool, x, y, scale: 0, active: true });
            });
        })();
    });

    ipcMain.handle("app:getDesktopCapturerSources", async (event, options: unknown) => {
        const config = createDesktopConfig({
            ...process.env,
            portalUrl: settings.get("portal_url"),
        });
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
            // annotation overlay on the correct display.
            display_id: source.display_id ? Number(source.display_id) : undefined,
        }));
        desktopCapturerCacheByFrame.set(frameKey, { at: Date.now(), result });
        return result;
    });

    ipcMain.handle("app:loadPortal", async () => loadDesktopTarget(settings.get("portal_url")));

    // ---- Desktop navigation (first-launch Landing + in-game world switcher) ----
    // Validate a user-supplied world URL before handing it to the main window. This gives both
    // UIs a useful error instead of silently falling back to the portal.
    ipcMain.handle("app:navigation:joinWorld", async (event, rawUrl: unknown) => {
        if (!isFromMainRenderer(event)) {
            ElectronLog.warn("Rejected world navigation from non-main renderer");
            return { ok: false, error: "This action is only available in the desktop app." };
        }
        const config = createDesktopConfig({
            ...process.env,
            portalUrl: settings.get("portal_url"),
        });
        const validation = validateDesktopNavigationUrl(rawUrl, config);
        if (!validation.ok) {
            return validation;
        }
        const safeUrl = validation.url;
        try {
            const loaded = await loadDesktopTarget(safeUrl);
            return loaded
                ? { ok: true }
                : { ok: false, error: "This world could not be loaded. Please check the URL and try again." };
        } catch (error) {
            ElectronLog.error(`app:navigation:joinWorld failed for ${safeUrl}`, error);
            return { ok: false, error: error instanceof Error ? error.message : "Failed to open world." };
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
        if (!isFromMainRenderer(event)) {
            ElectronLog.warn("Rejected pinned worlds request from non-main renderer");
            return [];
        }
        return getPinnedWorlds();
    });

    ipcMain.handle("app:navigation:togglePin", (event, rawUrl: unknown) => {
        if (!isFromMainRenderer(event)) {
            ElectronLog.warn("Rejected pin toggle from non-main renderer");
            return { ok: false, error: "This action is only available in the desktop app." };
        }
        if (typeof rawUrl !== "string" || !rawUrl.trim()) {
            return { ok: false, error: "A world URL is required." };
        }
        const pinned = toggleWorldPin(rawUrl);
        return { ok: true, pinned };
    });

    ipcMain.handle("app:navigation:isPinned", (event, rawUrl: unknown) => {
        if (!isFromMainRenderer(event) || typeof rawUrl !== "string") {
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
        if (!isFromMainRenderer(event)) {
            ElectronLog.warn("Rejected admin signup navigation from non-main renderer");
            return { ok: false, error: "This action is only available in the desktop app." };
        }
        const url = getAdminSignupUrl();
        try {
            await shell.openExternal(url);
            return { ok: true };
        } catch (error) {
            ElectronLog.error(`Failed to open admin signup URL ${url}`, error);
            return { ok: false, error: "The signup page could not be opened." };
        }
    });

    // ---- Picture-in-Picture (native utility window) ----
    // The PiP utility window is a frameless, always-on-top BrowserWindow that mirrors video tracks
    // from the main renderer via a renderer↔renderer RTCPeerConnection. All SDP/ICE signalling is
    // relayed through the main process; no external network is involved.
    // "The main renderer" is now the ACTIVE world view (the on-screen tab). Media / PiP / presence
    // / presenter / navigation IPC is only honoured from the foreground world; a backgrounded tab
    // must not drive the tray, PiP or capture. Window operations still use getWindow() (the shell).
    function isFromMainRenderer(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean {
        return isActiveWorldContents(event.sender);
    }

    function isFromNativeLanding(event: Electron.IpcMainInvokeEvent): boolean {
        if (!isFromMainRenderer(event) || event.senderFrame?.parent !== null) {
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
        if (!isPipWindowOpen()) {
            createPipWindow({
                onClosed: () => {
                    getActiveWorldContents()?.send("app:pip:closed");
                },
            });
        }
        // Block until the PiP renderer has wired up its IPC listeners. Without this, the very
        // first SDP offer (sent immediately after open() resolves on the main renderer side)
        // would land in a deaf renderer, and tracks would only start mirroring after the next
        // store change (someone joining/leaving the meeting).
        await awaitPipReady();
        return true;
    });

    ipcMain.handle("app:pip:close", () => {
        closePipWindow();
    });

    // Main renderer → PiP renderer
    ipcMain.on("app:pip:offer-from-main", (event, sdp: unknown) => {
        if (!isFromMainRenderer(event) || !isPipWindowOpen()) return;
        sendToPip("app:pip:offer", sdp);
    });
    ipcMain.on("app:pip:ice-from-main-renderer", (event, candidate: unknown) => {
        if (!isFromMainRenderer(event) || !isPipWindowOpen()) return;
        sendToPip("app:pip:ice-from-main", candidate);
    });

    // PiP renderer → main renderer (relayed by main process, to the active world view)
    ipcMain.on("app:pip:answer", (_event, sdp: unknown) => {
        getActiveWorldContents()?.send("app:pip:answer-to-main", sdp);
    });
    ipcMain.on("app:pip:ice-from-pip", (_event, candidate: unknown) => {
        getActiveWorldContents()?.send("app:pip:ice-to-main", candidate);
    });
    ipcMain.on("app:pip:request-close", () => {
        getActiveWorldContents()?.send("app:pip:request-close-from-pip");
        closePipWindow();
    });
    ipcMain.on("app:pip:ready", () => {
        markPipReady();
        getActiveWorldContents()?.send("app:pip:opened");
    });

    // Source enumeration FOR the PiP window only. The main renderer goes through
    // `app:getDesktopCapturerSources` which validates against allow-listed origins; that check
    // would reject the PiP renderer (file://). Here we only need to confirm the sender IS our PiP
    // window's webContents — there is no other webContents in the app with the preload-pip script,
    // so no third party can reach this handler.
    ipcMain.handle("app:pip:request-sources", async (event) => {
        const pipWindow = getPipWindow();
        if (!pipWindow || pipWindow.isDestroyed() || event.sender !== pipWindow.webContents) {
            ElectronLog.warn("Rejected app:pip:request-sources from a non-PiP renderer");
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
            // Lets pick-source carry the target display so the overlay/HUD land on the right screen.
            display_id: source.display_id ? Number(source.display_id) : undefined,
        }));
    });

    // Show a big number on every physical display; the user clicks one to share it. Resolves the
    // matching screen source (with its display id) so the annotation overlay can target it exactly.
    ipcMain.handle("app:pip:identify-screens", async (event) => {
        const pipWindow = getPipWindow();
        if (!pipWindow || pipWindow.isDestroyed() || event.sender !== pipWindow.webContents) {
            ElectronLog.warn("Rejected app:pip:identify-screens from a non-PiP renderer");
            return null;
        }
        return identifyScreens();
    });
    ipcMain.on("app:screen-identify:pick", (event) => {
        handleScreenIdentifyPick(event.sender.id);
    });
    ipcMain.on("app:screen-identify:cancel", () => {
        handleScreenIdentifyCancel();
    });

    // Main renderer pushes tile metadata + device state (mic/cam/screenshare) to the PiP renderer.
    // The PiP renderer pushes user actions (toggle mic/cam/screenshare/close) back. Both channels
    // are validated: state can only originate from the main renderer; commands can only come from
    // the PiP window's webContents (the only sender that holds the preload-pip script).
    ipcMain.on("app:pip:state-from-main", (event, state: unknown) => {
        if (!isFromMainRenderer(event) || !isPipWindowOpen()) return;
        sendToPip("app:pip:state-to-pip", state);
    });

    ipcMain.on("app:pip:command-from-pip", (_event, command: unknown) => {
        // Intercept `focus-main` directly in the main process — it does not need to round-trip
        // through the renderer. The defensive close on mainWindow.on('focus') then naturally
        // tears down the PiP utility window.
        if (command !== null && typeof command === "object" && (command as { type?: unknown }).type === "focus-main") {
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
        getActiveWorldContents()?.send("app:pip:command-to-main", command);
    });

    // ---- Screen-annotation overlay (transparent, always-on-top, click-through) ----
    // A real desktop window that covers the shared screen; captured by getDisplayMedia so strokes
    // are baked into the shared pixels. Draw ops from the presenter are relayed to the main renderer,
    // which routes them through the normal Space-event annotation sync.
    function isFromOverlayRenderer(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean {
        const overlayWin = getOverlayWindow();
        return Boolean(overlayWin) && !overlayWin!.isDestroyed() && event.sender === overlayWin!.webContents;
    }

    ipcMain.handle("app:overlay:open", async (event, opts: unknown) => {
        if (!isFromMainRenderer(event)) {
            ElectronLog.warn("Rejected overlay open from non-main renderer");
            return false;
        }
        const options = (opts && typeof opts === "object" ? opts : {}) as { displayId?: unknown; sourceId?: unknown };
        let displayId = typeof options.displayId === "number" ? options.displayId : undefined;
        // Cover the screen that is actually being shared (not the primary display).
        if (displayId === undefined && typeof options.sourceId === "string" && options.sourceId.startsWith("screen:")) {
            displayId = await resolveDisplayIdFromScreenSource(options.sourceId);
        }
        ElectronLog.info(
            `overlay:open sourceId=${String(options.sourceId)} displayIdIn=${String(
                options.displayId
            )} resolvedDisplayId=${String(displayId)}`
        );
        if (!isOverlayWindowOpen()) {
            createOverlayWindow({
                displayId,
                onClosed: () => {
                    getActiveWorldContents()?.send("app:overlay:exit-to-main");
                },
            });
        }
        await awaitOverlayReady();
        return true;
    });

    ipcMain.handle("app:overlay:close", () => {
        closeOverlayWindow();
    });

    // Main renderer → overlay renderer
    ipcMain.on("app:overlay:set-draw-mode", (event, enabled: unknown) => {
        if (!isFromMainRenderer(event) || !isOverlayWindowOpen()) return;
        setOverlayDrawMode(enabled === true);
        sendToOverlay("app:overlay:draw-mode", enabled === true);
    });
    ipcMain.on("app:overlay:set-tool", (event, tool: unknown) => {
        if (!isFromMainRenderer(event) || !isOverlayWindowOpen()) return;
        sendToOverlay("app:overlay:tool", tool);
    });
    ipcMain.on("app:overlay:set-elements", (event, elements: unknown) => {
        if (!isFromMainRenderer(event) || !isOverlayWindowOpen()) return;
        sendToOverlay("app:overlay:elements", elements);
    });

    // Overlay renderer → main renderer (active world view)
    ipcMain.on("app:overlay:draw-from-overlay", (event, op: unknown) => {
        if (!isFromOverlayRenderer(event)) return;
        getActiveWorldContents()?.send("app:overlay:draw-to-main", op);
    });
    ipcMain.on("app:overlay:request-exit", (event) => {
        if (!isFromOverlayRenderer(event)) return;
        getActiveWorldContents()?.send("app:overlay:exit-to-main");
    });
    ipcMain.on("app:overlay:ready", (event) => {
        if (!isFromOverlayRenderer(event)) return;
        markOverlayReady();
    });

    // ---- Presenter HUD (meeting bar + annotation bar) ----
    // Two content-protected floating windows placed on the SHARED display: the presenter sees
    // them, the captured stream does not. State is pushed from the main renderer; user actions
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
    ipcMain.handle("app:hud:close-meeting-bar", () => {
        closeHudWindow("meeting-bar");
    });
    ipcMain.handle("app:hud:open-annotation-bar", async (event, opts: unknown) => {
        if (!isFromMainRenderer(event)) {
            ElectronLog.warn("Rejected annotation-bar open from non-main renderer");
            return false;
        }
        return openHudWindow("annotation-bar", await resolveHudDisplayId(opts));
    });
    ipcMain.handle("app:hud:close-annotation-bar", () => {
        closeHudWindow("annotation-bar");
    });

    // Main renderer → HUD windows
    ipcMain.on("app:hud:state-from-main", (event, state: unknown) => {
        if (!isFromMainRenderer(event)) return;
        broadcastHudState(state);
    });

    // HUD windows → main renderer
    ipcMain.on("app:hud:command-from-hud", (event, command: unknown) => {
        if (!isHudSender(event.sender)) return;
        const type =
            command !== null && typeof command === "object" ? (command as { type?: unknown }).type : undefined;
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
        // The floating meeting toolbar is main-managed (not tied to the screen-share PresenterHud
        // bridge), so its mic/camera toggles are handled here via the same path the global
        // shortcuts use — reliable whether or not a screen share is active.
        if (hudKindOfSender(event.sender) === "floating-meeting" && getWindow()) {
            if (type === "toggle-mic") {
                emitMuteToggle();
            } else if (type === "toggle-camera") {
                emitCameraToggle();
            }
            return;
        }
        getActiveWorldContents()?.send("app:hud:command-to-main", command);
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

    ipcMain.on("app:hud:set-expanded", (event, expanded: unknown) => {
        setMeetingBarExpanded(event.sender, expanded === true);
    });
    ipcMain.on("app:hud:ready", (event) => {
        markHudReady(event.sender);
    });

    ipcMain.handle("local-app:reloadShortcuts", (event) => loadShortcuts());

    ipcMain.handle("local-app:getSettings", (event) => settings.get() || {});

    ipcMain.handle("local-app:setShortcutsEnabled", (event, enabled: boolean) => setShortcutsEnabled(enabled));
};
