import { BrowserWindow, screen } from "electron";
import ElectronLog from "electron-log";
import path from "path";

let pipWindow: BrowserWindow | undefined;
let pipReady = false;
let pipReadyPromise: Promise<void> | undefined;
let pipReadyResolve: (() => void) | undefined;

export function isPipWindowOpen(): boolean {
    return Boolean(pipWindow && !pipWindow.isDestroyed());
}

export function getPipWindow(): BrowserWindow | undefined {
    return pipWindow;
}

export function awaitPipReady(): Promise<void> {
    if (!pipWindow || pipWindow.isDestroyed()) {
        return Promise.resolve();
    }
    if (pipReady) {
        return Promise.resolve();
    }
    return pipReadyPromise ?? Promise.resolve();
}

type CreatePipOptions = {
    onClosed?: () => void;
    onRequestClose?: () => void;
};

export function createPipWindow(opts: CreatePipOptions = {}): BrowserWindow {
    if (pipWindow && !pipWindow.isDestroyed()) {
        pipWindow.show();
        pipWindow.focus();
        return pipWindow;
    }

    const display = screen.getPrimaryDisplay();
    const margin = 24;

    const newWindow = new BrowserWindow({
        width: 420,
        height: 320,
        minWidth: 360,
        minHeight: 260,
        x: Math.max(display.workArea.x + display.workArea.width - 420 - margin, display.workArea.x),
        y: Math.max(display.workArea.y + display.workArea.height - 320 - margin, display.workArea.y),
        frame: false,
        resizable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        focusable: true,
        show: false,
        backgroundColor: "#0b1220",
        webPreferences: {
            preload: path.resolve(__dirname, "preload-pip", "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });
    pipWindow = newWindow;
    newWindow.setMenu(null);
    // macOS: stay visible across Spaces and on top of full-screen apps.
    try {
        newWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch (error) {
        ElectronLog.debug("PiP setVisibleOnAllWorkspaces failed", error);
    }
    try {
        newWindow.setAlwaysOnTop(true, "floating");
    } catch (error) {
        ElectronLog.debug("PiP setAlwaysOnTop failed", error);
    }

    // Capture per-window state in this closure. The previous design wrote pipReadyResolve /
    // pipReadyPromise to module-level vars, then nulled them inside the 'closed' handler — but
    // the OLD 'closed' event can fire AFTER a brand-new createPipWindow has overwritten those
    // module vars with the NEW window's promise/resolver. The old handler would then nuke the
    // new refs, leaving markPipReady() with nothing to resolve when the new renderer signals
    // ready → pip.open() resolved prematurely from the old window's close → main client sent
    // its SDP offer to a renderer whose onOffer handler wasn't wired yet → no video.
    let myResolve: (() => void) | undefined;
    const myPromise = new Promise<void>((resolve) => { myResolve = resolve; });
    pipReady = false;
    pipReadyPromise = myPromise;
    pipReadyResolve = myResolve;

    newWindow.once("ready-to-show", () => {
        if (newWindow.isDestroyed()) return;
        newWindow.show();
    });

    // Intentionally do NOT resolve pipReady on did-finish-load: that fires before the renderer
    // script + contextBridge subscriptions are wired up. The renderer sends `app:pip:ready`
    // from inside its IIFE after subscribing to all channels; ipc.ts wires that to
    // markPipReady() below.

    newWindow.on("closed", () => {
        // Only mutate module-level state if THIS instance is still the active window. A late
        // 'closed' event on a replaced window must NOT touch the new window's refs.
        if (pipWindow === newWindow) {
            pipWindow = undefined;
            pipReady = false;
            pipReadyPromise = undefined;
            pipReadyResolve = undefined;
        }
        // Always unblock THIS instance's promise so any pending awaiter from the stale session
        // (there shouldn't be any, but defense in depth) is freed.
        myResolve?.();
        opts.onClosed?.();
    });

    const indexPath = path.resolve(__dirname, "..", "assets", "pip", "index.html");
    newWindow.loadFile(indexPath).catch((error) => {
        ElectronLog.error(`Failed to load PiP renderer at ${indexPath}`, error);
        try { newWindow.destroy(); } catch { /* best-effort */ }
        if (pipWindow === newWindow) {
            pipWindow = undefined;
        }
        opts.onClosed?.();
    });

    return newWindow;
}

export function closePipWindow(): void {
    if (pipWindow && !pipWindow.isDestroyed()) {
        pipWindow.close();
    }
    pipWindow = undefined;
    pipReady = false;
    // Leave pipReadyPromise / pipReadyResolve untouched here — the (already-fired) 'closed'
    // handler captured them in its own closure and will resolve the promise when the OS-level
    // close completes. Clearing the module refs would prevent a still-pending awaiter from
    // being unblocked.
    pipReadyPromise = undefined;
    pipReadyResolve = undefined;
}

export function sendToPip(channel: string, payload?: unknown): void {
    if (pipWindow && !pipWindow.isDestroyed()) {
        pipWindow.webContents.send(channel, payload);
    }
}

export function markPipReady(): void {
    if (!pipWindow || pipWindow.isDestroyed()) {
        return;
    }
    pipReady = true;
    pipReadyResolve?.();
}
