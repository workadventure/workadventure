import { BrowserWindow, screen } from "electron";
import ElectronLog from "electron-log";
import path from "path";
import { raiseHudsToTop } from "./hud-windows";

let overlayWindow: BrowserWindow | undefined;
let overlayReady = false;
let overlayReadyPromise: Promise<void> | undefined;
let overlayReadyResolve: (() => void) | undefined;

export function isOverlayWindowOpen(): boolean {
    return Boolean(overlayWindow && !overlayWindow.isDestroyed());
}

export function getOverlayWindow(): BrowserWindow | undefined {
    return overlayWindow;
}

export function awaitOverlayReady(): Promise<void> {
    if (!overlayWindow || overlayWindow.isDestroyed() || overlayReady) {
        return Promise.resolve();
    }
    return overlayReadyPromise ?? Promise.resolve();
}

type CreateOverlayOptions = {
    /** Electron Display.id of the shared screen to cover. Falls back to the primary display. */
    displayId?: number;
    onClosed?: () => void;
};

/** Resolve the target Electron Display, matching by id when provided. Shared with the HUD bars. */
export function resolveDisplay(displayId: number | undefined, label = "Overlay"): Electron.Display {
    const all = screen.getAllDisplays();
    if (typeof displayId === "number") {
        const match = all.find((display) => display.id === displayId);
        if (match) {
            ElectronLog.info(`${label} target display ${match.id} bounds=${JSON.stringify(match.bounds)}`);
            return match;
        }
        ElectronLog.warn(
            `${label}: no display matches id ${displayId}; using primary. Available ids: ${all
                .map((d) => d.id)
                .join(", ")}`
        );
    } else {
        ElectronLog.warn(`${label}: no displayId resolved; using primary display.`);
    }
    return screen.getPrimaryDisplay();
}

/**
 * Create a transparent, click-through, always-on-top window that exactly covers the shared display.
 * Because it is a real desktop window, it is captured by getDisplayMedia, so the strokes drawn on it
 * are baked into the shared pixels for every viewer.
 */
export function createOverlayWindow(opts: CreateOverlayOptions = {}): BrowserWindow {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.show();
        return overlayWindow;
    }

    const display = resolveDisplay(opts.displayId);
    const { x, y, width, height } = display.bounds;

    const newWindow = new BrowserWindow({
        x,
        y,
        width,
        height,
        transparent: true,
        frame: false,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        // Never steal focus from the app the presenter is actually driving.
        focusable: false,
        hasShadow: false,
        backgroundColor: "#00000000",
        show: false,
        webPreferences: {
            preload: path.resolve(__dirname, "preload-overlay", "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });
    overlayWindow = newWindow;
    newWindow.setMenu(null);
    // Click-through by default: the presenter keeps using their real apps until draw mode is on.
    newWindow.setIgnoreMouseEvents(true, { forward: true });
    try {
        newWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch (error) {
        ElectronLog.debug("Overlay setVisibleOnAllWorkspaces failed", error);
    }
    try {
        // Keep the annotation layer above the shared content (Zoom-style).
        newWindow.setAlwaysOnTop(true, "screen-saver");
    } catch (error) {
        ElectronLog.debug("Overlay setAlwaysOnTop failed", error);
    }

    // Per-window ready promise captured in this closure (see pip-window.ts for the rationale: a late
    // 'closed' from a replaced window must not clobber a newer window's ready state).
    let myResolve: (() => void) | undefined;
    overlayReadyPromise = new Promise<void>((resolve) => {
        myResolve = resolve;
    });
    overlayReady = false;
    overlayReadyResolve = myResolve;

    newWindow.once("ready-to-show", () => {
        if (!newWindow.isDestroyed()) {
            newWindow.showInactive();
            // The overlay shares the "screen-saver" always-on-top level with the HUD bars. Since
            // it is shown after them (opened asynchronously from the draw-mode subscription), it
            // would otherwise land on top and — once draw mode captures the mouse — swallow every
            // click the presenter aims at the meeting-bar / annotation-bar. Re-raise the HUDs so
            // they stay clickable.
            raiseHudsToTop();
        }
    });

    newWindow.on("closed", () => {
        if (overlayWindow === newWindow) {
            overlayWindow = undefined;
            overlayReady = false;
            overlayReadyPromise = undefined;
            overlayReadyResolve = undefined;
        }
        myResolve?.();
        opts.onClosed?.();
    });

    const indexPath = path.resolve(__dirname, "..", "assets", "overlay", "index.html");
    newWindow.loadFile(indexPath).catch((error) => {
        ElectronLog.error(`Failed to load overlay renderer at ${indexPath}`, error);
        try {
            newWindow.destroy();
        } catch {
            /* best-effort */
        }
        if (overlayWindow === newWindow) {
            overlayWindow = undefined;
        }
        opts.onClosed?.();
    });

    return newWindow;
}

export function closeOverlayWindow(): void {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.close();
    }
    overlayWindow = undefined;
    overlayReady = false;
    overlayReadyPromise = undefined;
    overlayReadyResolve = undefined;
}

/** Toggle whether the overlay captures pointer input (draw mode) or passes clicks through. */
export function setOverlayDrawMode(enabled: boolean): void {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
        return;
    }
    overlayWindow.setIgnoreMouseEvents(!enabled, { forward: true });
    // Entering draw mode is the moment the overlay actually competes with the HUDs for clicks —
    // re-raise them now in case a space switch or unrelated re-order dropped them behind.
    if (enabled) {
        raiseHudsToTop();
    }
}

export function sendToOverlay(channel: string, payload?: unknown): void {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send(channel, payload);
    }
}

export function markOverlayReady(): void {
    if (!overlayWindow || overlayWindow.isDestroyed()) {
        return;
    }
    overlayReady = true;
    overlayReadyResolve?.();
}
