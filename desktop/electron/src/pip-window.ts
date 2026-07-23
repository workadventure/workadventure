import { WebContentsView } from "electron";
import ElectronLog from "electron-log";
import path from "path";
import { getHudWindow } from "./hud-windows";

/**
 * The meeting video (formerly a standalone always-on-top PiP window) is now embedded as a child
 * WebContentsView of the companion window, shown over the Meeting tab. The proven PiP renderer
 * (assets/pip + the preload-pip `WADPiP` bridge + the WebRTC mirroring) is reused UNCHANGED — only
 * its host changes from a top-level BrowserWindow to this child view, and its bounds/visibility are
 * driven by the companion (which reports the Meeting-tab rect and its active tab).
 *
 * The public function names are kept (`createPipWindow`, `closePipWindow`, `isPipWindowOpen`, …) so
 * the app:pip:* relay in ipc.ts and the front's WAD.pip client are untouched.
 */

let pipView: WebContentsView | undefined;
let hostWindow: Electron.BrowserWindow | undefined;
let pipReady = false;
let pipReadyPromise: Promise<void> | undefined;
let pipReadyResolve: (() => void) | undefined;
/** Last Meeting-tab rect reported by the companion; where the view sits while visible. */
let lastBounds: Electron.Rectangle | undefined;
/** Whether the Meeting tab is currently active (the view is only shown then). */
let viewVisible = false;

// Parked far off-screen while hidden (WebContentsView has no reliable "detached" state we can keep
// wired for IPC — parking keeps the webContents alive and mirroring while invisible).
const HIDDEN_BOUNDS: Electron.Rectangle = { x: -20000, y: -20000, width: 320, height: 240 };

export function isPipWindowOpen(): boolean {
    return Boolean(pipView && !pipView.webContents.isDestroyed());
}

/** The PiP renderer's webContents, for sender validation. */
export function getPipWebContents(): Electron.WebContents | undefined {
    return pipView && !pipView.webContents.isDestroyed() ? pipView.webContents : undefined;
}

export function awaitPipReady(): Promise<void> {
    if (!isPipWindowOpen() || pipReady) {
        return Promise.resolve();
    }
    return pipReadyPromise ?? Promise.resolve();
}

type CreatePipOptions = {
    onClosed?: () => void;
    onRequestClose?: () => void;
};

function destroyPipView(): void {
    const view = pipView;
    const host = hostWindow;
    pipView = undefined;
    hostWindow = undefined;
    pipReady = false;
    pipReadyPromise = undefined;
    pipReadyResolve = undefined;
    if (!view) {
        return;
    }
    try {
        if (host && !host.isDestroyed()) {
            host.contentView.removeChildView(view);
        }
    } catch (error) {
        ElectronLog.debug("PiP removeChildView failed", error);
    }
    try {
        if (!view.webContents.isDestroyed()) {
            view.webContents.close();
        }
    } catch (error) {
        ElectronLog.debug("PiP webContents.close failed", error);
    }
}

export function createPipWindow(opts: CreatePipOptions = {}): Electron.WebContents | undefined {
    const companion = getHudWindow("companion");
    if (!companion) {
        ElectronLog.warn("PiP: cannot create — companion window is not open");
        return undefined;
    }
    if (pipView && !pipView.webContents.isDestroyed() && hostWindow === companion) {
        return pipView.webContents;
    }
    // A view attached to a now-gone / different companion window: drop it and re-create.
    destroyPipView();

    const view = new WebContentsView({
        webPreferences: {
            preload: path.resolve(__dirname, "preload-pip", "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            // The companion is a background window by definition; don't throttle or the meeting
            // video freezes exactly when it's in use.
            backgroundThrottling: false,
        },
    });
    pipView = view;
    hostWindow = companion;
    try {
        view.setBackgroundColor("#0b1220");
    } catch (error) {
        ElectronLog.debug("PiP setBackgroundColor failed", error);
    }
    view.setBounds(viewVisible && lastBounds ? lastBounds : HIDDEN_BOUNDS);
    companion.contentView.addChildView(view);
    view.setVisible(viewVisible);

    // Per-view ready promise (see pip-window history: never resolve on did-finish-load — the
    // renderer signals app:pip:ready from inside its IIFE once its channels are wired).
    let myResolve: (() => void) | undefined;
    pipReadyPromise = new Promise<void>((resolve) => {
        myResolve = resolve;
    });
    pipReady = false;
    pipReadyResolve = myResolve;

    view.webContents.on("destroyed", () => {
        if (pipView === view) {
            pipView = undefined;
            hostWindow = undefined;
            pipReady = false;
            pipReadyPromise = undefined;
            pipReadyResolve = undefined;
        }
        myResolve?.();
        opts.onClosed?.();
    });

    const indexPath = path.resolve(__dirname, "..", "assets", "pip", "index.html");
    view.webContents.loadFile(indexPath).catch((error) => {
        ElectronLog.error(`Failed to load PiP renderer at ${indexPath}`, error);
        destroyPipView();
        opts.onClosed?.();
    });

    return view.webContents;
}

export function closePipWindow(): void {
    destroyPipView();
}

export function sendToPip(channel: string, payload?: unknown): void {
    if (pipView && !pipView.webContents.isDestroyed()) {
        pipView.webContents.send(channel, payload);
    }
}

export function markPipReady(): void {
    if (!isPipWindowOpen()) {
        return;
    }
    pipReady = true;
    pipReadyResolve?.();
}

/** Position the embedded PiP over the companion's Meeting-tab content area (companion-reported). */
export function setPipViewBounds(bounds: Electron.Rectangle): void {
    lastBounds = bounds;
    if (viewVisible && pipView && !pipView.webContents.isDestroyed()) {
        pipView.setBounds(bounds);
    }
}

/** Show/hide the embedded PiP — shown only while the companion's Meeting tab is active. */
export function setPipViewVisible(visible: boolean): void {
    viewVisible = visible;
    if (!pipView || pipView.webContents.isDestroyed()) {
        return;
    }
    pipView.setBounds(visible && lastBounds ? lastBounds : HIDDEN_BOUNDS);
    view_setVisible(pipView, visible);
}

function view_setVisible(view: WebContentsView, visible: boolean): void {
    try {
        view.setVisible(visible);
    } catch (error) {
        ElectronLog.debug("PiP setVisible failed", error);
    }
}
