import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import ElectronLog from "electron-log";
import settings from "./settings";
import { normalizeCompanionBounds } from "./companion-window-policy";
import { HUD_SIZES, type HudKind, meetingBarBounds, resolveDisplay, setUpHudWindow } from "./hud-windows";
import { getControllingWorldContents } from "./tab-manager";
import { pageSaidHello } from "./page-contract";

/**
 * The companion and the meeting bar are child windows of the world page, rendered by play's own Svelte
 * components in the world's renderer, like the browser's Document PiP: they read the page's stores and
 * play its MediaStreams directly. Main still decides when they open (companion-controller, the share
 * surfaces): it asks the world page to call window.open, and the window-open handler only lets that one
 * through while the request is pending.
 */

/** window.open target name the world page uses for each window. */
export const CHILD_WINDOW_FRAME_NAMES: Record<HudKind, string> = {
    companion: "wa-companion",
    "meeting-bar": "wa-meeting-bar",
};

// The world page answers within a frame or two; past this, the open failed.
const OPEN_TIMEOUT_MS = 3000;

type PendingOpen = { bounds: Electron.Rectangle; resolve: (opened: boolean) => void };
const pending = new Map<HudKind, PendingOpen>();

function boundsFor(kind: HudKind, displayId: number | undefined): Electron.Rectangle {
    const display = resolveDisplay(displayId, kind);
    return kind === "companion"
        ? normalizeCompanionBounds(settings.get("companion_bounds"), display.workArea, HUD_SIZES.companion)
        : meetingBarBounds(display);
}

/** Ask the world page that controls the floating windows to open one; resolves once it is adopted. */
export function openChildWindow(kind: HudKind, displayId: number | undefined): Promise<boolean> {
    const world = getControllingWorldContents();
    // A page that did not say hello (an older WorkAdventure) cannot render these windows.
    if (!world || !pageSaidHello(world) || pending.has(kind)) {
        return Promise.resolve(false);
    }
    const bounds = boundsFor(kind, displayId);
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            ElectronLog.warn(`The world page did not open the ${kind} in time.`);
            pending.delete(kind);
            resolve(false);
        }, OPEN_TIMEOUT_MS);
        pending.set(kind, {
            bounds,
            resolve: (opened) => {
                clearTimeout(timer);
                pending.delete(kind);
                resolve(opened);
            },
        });
        world.send("app:windows:open", kind);
    });
}

function kindOfFrame(frameName: string): HudKind | undefined {
    return (Object.keys(CHILD_WINDOW_FRAME_NAMES) as HudKind[]).find(
        (kind) => CHILD_WINDOW_FRAME_NAMES[kind] === frameName
    );
}

/** For the world's window-open handler: the window's options, only while main asked for it. */
export function childWindowOptions(url: string, frameName: string): BrowserWindowConstructorOptions | undefined {
    const kind = kindOfFrame(frameName);
    const request = kind && pending.get(kind);
    if (!kind || !request || url !== "about:blank") {
        return undefined;
    }
    const common: BrowserWindowConstructorOptions = {
        ...request.bounds,
        frame: false,
        movable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        show: false,
    };
    return kind === "companion"
        ? { ...common, resizable: true, backgroundColor: "#1b1b29" }
        : // The bar sizes itself to its content (the pill, a menu, the source picker): only that shows.
          { ...common, resizable: false, transparent: true, hasShadow: false, backgroundColor: "#00000000" };
}

/** did-create-window of the world page: the child window becomes the floating window it was asked for. */
export function adoptChildWindow(window: BrowserWindow, frameName: string): void {
    const kind = kindOfFrame(frameName);
    const request = kind && pending.get(kind);
    if (!kind || !request) {
        return;
    }
    setUpHudWindow(kind, window);
    request.resolve(true);
}
