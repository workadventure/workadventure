import { ipcMain, app, desktopCapturer } from "electron";
import ElectronLog from "electron-log";
import electronIsDev from "electron-is-dev";
import { createAndShowNotification } from "./notification";
import settings from "./settings";
import { loadShortcuts, setShortcutsEnabled } from "./shortcuts";
import { getDesktopWindowState, getWindow, loadDesktopTarget } from "./window";
import { createDesktopConfig, isAllowedNavigationUrl } from "./desktop-url-policy";
import { awaitPipReady, closePipWindow, createPipWindow, getPipWindow, isPipWindowOpen, markPipReady, sendToPip } from "./pip-window";

const DESKTOP_CAPTURER_ALLOWED_TYPES = new Set(["screen", "window"]);
const DESKTOP_CAPTURER_MAX_THUMBNAIL = { width: 320, height: 180 };
const DESKTOP_CAPTURER_MIN_INTERVAL_MS = 250;
const desktopCapturerLastCallByFrame = new Map<string, number>();

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
              (t): t is AllowedSourceType =>
                  typeof t === "string" && DESKTOP_CAPTURER_ALLOWED_TYPES.has(t),
          )
        : [];
    return {
        types: types.length > 0 ? types : ["screen", "window"],
        thumbnailSize: clampThumbnailSize(raw.thumbnailSize),
    };
}

export function emitMuteToggle() {
    const mainWindow = getWindow();
    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    mainWindow.webContents.send("app:on-mute-toggle");
}

export function emitCameraToggle() {
    const mainWindow = getWindow();
    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    mainWindow.webContents.send("app:on-camera-toggle");
}

export default () => {
    ipcMain.handle("is-development", () => electronIsDev);
    ipcMain.handle("get-version", () => (electronIsDev ? "dev" : app.getVersion()));
    ipcMain.handle("app:getWindowState", () => getDesktopWindowState());

    // app ipc
    ipcMain.on("app:notify", (event, txt: string) => {
        createAndShowNotification({ body: txt });
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
        const last = desktopCapturerLastCallByFrame.get(frameKey) ?? 0;
        if (now - last < DESKTOP_CAPTURER_MIN_INTERVAL_MS) {
            return [];
        }
        desktopCapturerLastCallByFrame.set(frameKey, now);

        const sanitized = sanitizeDesktopCapturerOptions(options);
        const sources = await desktopCapturer.getSources(sanitized);
        return sources.map((source) => ({
            id: source.id,
            name: source.name,
            thumbnailURL: source.thumbnail.toDataURL(),
        }));
    });

    ipcMain.handle("app:loadPortal", async () => loadDesktopTarget(settings.get("portal_url")));

    // ---- Picture-in-Picture (native utility window) ----
    // The PiP utility window is a frameless, always-on-top BrowserWindow that mirrors video tracks
    // from the main renderer via a renderer↔renderer RTCPeerConnection. All SDP/ICE signalling is
    // relayed through the main process; no external network is involved.
    function isFromMainRenderer(event: Electron.IpcMainInvokeEvent | Electron.IpcMainEvent): boolean {
        const mainWindow = getWindow();
        return Boolean(mainWindow) && event.sender === mainWindow!.webContents;
    }

    ipcMain.handle("app:pip:open", async (event) => {
        if (!isFromMainRenderer(event)) {
            ElectronLog.warn("Rejected PiP open from non-main renderer");
            return false;
        }
        if (!isPipWindowOpen()) {
            createPipWindow({
                onClosed: () => {
                    const mainWindow = getWindow();
                    if (mainWindow && !mainWindow.webContents.isDestroyed()) {
                        mainWindow.webContents.send("app:pip:closed");
                    }
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

    // PiP renderer → main renderer (relayed by main process)
    ipcMain.on("app:pip:answer", (_event, sdp: unknown) => {
        const mainWindow = getWindow();
        if (mainWindow && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send("app:pip:answer-to-main", sdp);
        }
    });
    ipcMain.on("app:pip:ice-from-pip", (_event, candidate: unknown) => {
        const mainWindow = getWindow();
        if (mainWindow && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send("app:pip:ice-to-main", candidate);
        }
    });
    ipcMain.on("app:pip:request-close", () => {
        const mainWindow = getWindow();
        if (mainWindow && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send("app:pip:request-close-from-pip");
        }
        closePipWindow();
    });
    ipcMain.on("app:pip:ready", () => {
        markPipReady();
        const mainWindow = getWindow();
        if (mainWindow && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send("app:pip:opened");
        }
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
        }));
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
        if (
            command !== null &&
            typeof command === "object" &&
            (command as { type?: unknown }).type === "focus-main"
        ) {
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
        const mainWindow = getWindow();
        if (mainWindow && !mainWindow.webContents.isDestroyed()) {
            mainWindow.webContents.send("app:pip:command-to-main", command);
        }
    });

    ipcMain.handle("local-app:reloadShortcuts", (event) => loadShortcuts());

    ipcMain.handle("local-app:getSettings", (event) => settings.get() || {});

    ipcMain.handle("local-app:setShortcutsEnabled", (event, enabled: boolean) => setShortcutsEnabled(enabled));
};
