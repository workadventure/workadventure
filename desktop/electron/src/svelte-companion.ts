import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";
import ElectronLog from "electron-log";
import settings from "./settings";
import { normalizeCompanionBounds } from "./companion-window-policy";
import { HUD_SIZES, resolveDisplay, setUpHudWindow } from "./hud-windows";
import { getControllingWorldContents } from "./tab-manager";

/**
 * PROTOTYPE (WA_SVELTE_COMPANION=1): the companion is a child window of the world page, rendered by
 * play's own Svelte components in the world's renderer, like the browser's Document PiP. Main still
 * decides when it opens (companion-controller): it asks the world page to call window.open, and the
 * window-open handler only lets that one through while the request is pending.
 */
export const SVELTE_COMPANION = process.env.WA_SVELTE_COMPANION === "1";

/** window.open target name the world page uses for the companion. */
export const COMPANION_FRAME_NAME = "wa-companion";

// The world page answers within a frame or two; past this, the open failed.
const OPEN_TIMEOUT_MS = 3000;

let pending: { bounds: Electron.Rectangle; resolve: (opened: boolean) => void } | undefined;

export function openSvelteCompanion(displayId: number | undefined): Promise<boolean> {
    const world = getControllingWorldContents();
    if (!world || pending) {
        return Promise.resolve(false);
    }
    const display = resolveDisplay(displayId, "Svelte companion");
    const bounds = normalizeCompanionBounds(settings.get("companion_bounds"), display.workArea, HUD_SIZES.companion);
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            ElectronLog.warn("The world page did not open the Svelte companion in time.");
            pending = undefined;
            resolve(false);
        }, OPEN_TIMEOUT_MS);
        pending = {
            bounds,
            resolve: (opened) => {
                clearTimeout(timer);
                pending = undefined;
                resolve(opened);
            },
        };
        world.send("app:companion:open-window");
    });
}

/** For the world's window-open handler: the companion's window options, only while main asked for it. */
export function companionWindowOptions(url: string, frameName: string): BrowserWindowConstructorOptions | undefined {
    if (!pending || frameName !== COMPANION_FRAME_NAME || url !== "about:blank") {
        return undefined;
    }
    return {
        ...pending.bounds,
        frame: false,
        resizable: true,
        movable: true,
        minimizable: false,
        maximizable: false,
        fullscreenable: false,
        skipTaskbar: true,
        alwaysOnTop: true,
        show: false,
        backgroundColor: "#1b1b29",
    };
}

/** did-create-window of the world page: the child window becomes the companion HUD window. */
export function adoptCompanionWindow(window: BrowserWindow, frameName: string): void {
    if (!pending || frameName !== COMPANION_FRAME_NAME) {
        return;
    }
    void setUpHudWindow("companion", window, true);
    window.showInactive();
    window.moveTop();
    pending.resolve(true);
}
