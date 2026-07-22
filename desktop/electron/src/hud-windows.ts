import { BrowserWindow } from "electron";
import ElectronLog from "electron-log";
import path from "path";
import { resolveDisplay } from "./overlay-window";

/**
 * Presenter HUD windows (Zoom-style), placed on the SHARED display while screen sharing:
 *  - the "meeting bar": mic / camera / switch screen / stop share / annotate / back-to-app;
 *  - the "annotation bar": drawing tools, shown only while annotation mode is on.
 *
 * Both are frameless, always-on-top, draggable, and — crucially — content-protected
 * (`setContentProtection(true)`), so the presenter sees them but they are EXCLUDED from the
 * captured pixels. Only the transparent annotation overlay (a separate window) is captured.
 */

export type HudKind = "meeting-bar" | "annotation-bar" | "floating-meeting";

type HudEntry = {
    window: BrowserWindow;
    ready: boolean;
    readyPromise: Promise<void>;
    readyResolve: () => void;
};

const HUD_SIZES: Record<HudKind, { width: number; height: number }> = {
    "meeting-bar": { width: 680, height: 76 },
    "annotation-bar": { width: 700, height: 64 },
    // Compact Zoom-style pill: mic / camera / back-to-app.
    "floating-meeting": { width: 188, height: 62 },
};

/** Meeting-bar height while the screen-switch source picker is open (bottom edge stays anchored). */
const MEETING_BAR_EXPANDED_HEIGHT = 420;
const HUD_MARGIN = 24;

const hudWindows = new Map<HudKind, HudEntry>();

/** The last state pushed by the main renderer; replayed to a bar that opens afterwards. */
let lastHudState: unknown;

export function isHudWindowOpen(kind: HudKind): boolean {
    const entry = hudWindows.get(kind);
    return Boolean(entry && !entry.window.isDestroyed());
}

/** True when the given IPC sender is one of the HUD windows. */
export function isHudSender(sender: Electron.WebContents): boolean {
    for (const entry of hudWindows.values()) {
        if (!entry.window.isDestroyed() && entry.window.webContents === sender) {
            return true;
        }
    }
    return false;
}

export function hudKindOfSender(sender: Electron.WebContents): HudKind | undefined {
    for (const [kind, entry] of hudWindows.entries()) {
        if (!entry.window.isDestroyed() && entry.window.webContents === sender) {
            return kind;
        }
    }
    return undefined;
}

/** Push state to a single HUD window (used by the floating toolbar, driven directly from main). */
export function sendHudState(kind: HudKind, state: unknown): void {
    const entry = hudWindows.get(kind);
    if (entry && !entry.window.isDestroyed() && entry.ready) {
        entry.window.webContents.send("app:hud:state", state);
    }
}

/**
 * Force every open HUD window back to the top of its z-level. Called when another window at the
 * same always-on-top level (specifically the transparent annotation overlay) is shown after the
 * HUDs — otherwise the newcomer sits above them and swallows the presenter's clicks.
 */
export function raiseHudsToTop(): void {
    for (const entry of hudWindows.values()) {
        if (entry.window.isDestroyed()) {
            continue;
        }
        try {
            entry.window.moveTop();
        } catch (error) {
            ElectronLog.debug("HUD moveTop failed", error);
        }
    }
}

function positionFor(kind: HudKind, display: Electron.Display): { x: number; y: number } {
    const { width, height } = HUD_SIZES[kind];
    const area = display.workArea;
    const x = Math.round(area.x + (area.width - width) / 2);
    // Meeting bar + floating toolbar sit bottom-center (like Zoom's control bar); annotation bar
    // sits top-center so it doesn't overlap the meeting bar.
    const bottomAnchored = kind === "meeting-bar" || kind === "floating-meeting";
    const y = bottomAnchored ? Math.round(area.y + area.height - height - HUD_MARGIN) : area.y + HUD_MARGIN;
    return { x, y };
}

export async function openHudWindow(kind: HudKind, displayId?: number): Promise<boolean> {
    const existing = hudWindows.get(kind);
    if (existing && !existing.window.isDestroyed()) {
        // Re-open on a (possibly) different display: reposition instead of recreating.
        const display = resolveDisplay(displayId, `HUD ${kind}`);
        const { x, y } = positionFor(kind, display);
        const { width, height } = HUD_SIZES[kind];
        existing.window.setBounds({ x, y, width, height });
        existing.window.showInactive();
        await existing.readyPromise;
        return true;
    }

    const display = resolveDisplay(displayId, `HUD ${kind}`);
    const { x, y } = positionFor(kind, display);
    const { width, height } = HUD_SIZES[kind];

    const newWindow = new BrowserWindow({
        x,
        y,
        width,
        height,
        transparent: true,
        frame: false,
        resizable: false,
        // Movable so the pill can be dragged with -webkit-app-region: drag.
        movable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        focusable: true,
        hasShadow: false,
        backgroundColor: "#00000000",
        show: false,
        webPreferences: {
            preload: path.resolve(__dirname, "preload-hud", "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });
    newWindow.setMenu(null);
    try {
        // Excluded from screen capture: the presenter sees the bar, viewers do NOT.
        newWindow.setContentProtection(true);
    } catch (error) {
        ElectronLog.warn(`HUD ${kind} setContentProtection failed`, error);
    }
    try {
        newWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch (error) {
        ElectronLog.debug(`HUD ${kind} setVisibleOnAllWorkspaces failed`, error);
    }
    try {
        // relativeLevel +1 lifts the HUD one layer above the transparent overlay window (which
        // also lives at "screen-saver"). Without this the overlay — opened asynchronously from
        // the draw-mode subscription — lands on top of the HUD and, once draw mode captures
        // pointer events, the presenter can no longer click the meeting-bar / annotation-bar
        // buttons: the clicks are absorbed by the overlay. macOS reads the relativeLevel; on
        // other platforms the second-layer bump is a no-op but the moveTop below still runs.
        newWindow.setAlwaysOnTop(true, "screen-saver", 1);
    } catch (error) {
        ElectronLog.debug(`HUD ${kind} setAlwaysOnTop failed`, error);
    }

    // Per-window ready promise captured in this closure (see pip-window.ts for the rationale).
    let readyResolve: () => void = () => {};
    const readyPromise = new Promise<void>((resolve) => {
        readyResolve = resolve;
    });
    const entry: HudEntry = { window: newWindow, ready: false, readyPromise, readyResolve };
    hudWindows.set(kind, entry);

    newWindow.once("ready-to-show", () => {
        if (!newWindow.isDestroyed()) {
            // Never steal focus from the app the presenter is currently driving.
            newWindow.showInactive();
            // Cross-platform belt-and-braces: even with the relativeLevel bump above, if the
            // overlay was created just after the HUD, it can end up sitting above until the next
            // window ordering event. moveTop() forces the HUD to the top of its level right now.
            newWindow.moveTop();
        }
    });

    newWindow.on("closed", () => {
        if (hudWindows.get(kind)?.window === newWindow) {
            hudWindows.delete(kind);
        }
        readyResolve();
    });

    const indexPath = path.resolve(__dirname, "..", "assets", kind, "index.html");
    newWindow.loadFile(indexPath).catch((error) => {
        ElectronLog.error(`Failed to load HUD renderer at ${indexPath}`, error);
        try {
            newWindow.destroy();
        } catch {
            /* best-effort */
        }
        if (hudWindows.get(kind)?.window === newWindow) {
            hudWindows.delete(kind);
        }
    });

    await readyPromise;
    return isHudWindowOpen(kind);
}

export function closeHudWindow(kind: HudKind): void {
    const entry = hudWindows.get(kind);
    hudWindows.delete(kind);
    if (entry && !entry.window.isDestroyed()) {
        entry.window.close();
    }
}

export function closeAllHudWindows(): void {
    closeHudWindow("meeting-bar");
    closeHudWindow("annotation-bar");
}

/** Push the presenter state to every open HUD window (and replay it to late-opening ones). */
export function broadcastHudState(state: unknown): void {
    lastHudState = state;
    for (const entry of hudWindows.values()) {
        if (!entry.window.isDestroyed() && entry.ready) {
            entry.window.webContents.send("app:hud:state", state);
        }
    }
}

export function markHudReady(sender: Electron.WebContents): void {
    const kind = hudKindOfSender(sender);
    if (!kind) {
        return;
    }
    const entry = hudWindows.get(kind);
    if (!entry || entry.window.isDestroyed()) {
        return;
    }
    entry.ready = true;
    entry.readyResolve();
    if (lastHudState !== undefined) {
        entry.window.webContents.send("app:hud:state", lastHudState);
    }
}

/**
 * Grow/shrink the meeting bar so its source picker fits, keeping the bottom edge anchored where
 * the user left the bar (it may have been dragged away from its initial position).
 */
export function setMeetingBarExpanded(sender: Electron.WebContents, expanded: boolean): void {
    const kind = hudKindOfSender(sender);
    if (kind !== "meeting-bar") {
        return;
    }
    const entry = hudWindows.get(kind);
    if (!entry || entry.window.isDestroyed()) {
        return;
    }
    const bounds = entry.window.getBounds();
    const targetHeight = expanded ? MEETING_BAR_EXPANDED_HEIGHT : HUD_SIZES["meeting-bar"].height;
    if (bounds.height === targetHeight) {
        return;
    }
    const bottom = bounds.y + bounds.height;
    entry.window.setBounds({
        x: bounds.x,
        y: bottom - targetHeight,
        width: bounds.width,
        height: targetHeight,
    });
}
