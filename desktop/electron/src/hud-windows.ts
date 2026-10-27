import { type BrowserWindow, screen } from "electron";
import ElectronLog from "electron-log";
import settings from "./settings";
import { COMPANION_MIN_HEIGHT, COMPANION_MIN_WIDTH } from "./companion-window-policy";
import { shouldProtectWindowFromCapture } from "./content-protection";

/**
 * The floating windows: the companion and the presenter meeting bar. Both are child windows of the
 * world page, which renders them (child-windows.ts); this registry gives them their floating treatment
 * and lets the controllers find and close them.
 *
 * The meeting bar is placed on the SHARED display while screen sharing and — crucially — content-protected
 * (`setContentProtection(true)`), so the presenter sees it but it is EXCLUDED from the captured pixels.
 */

/** The display with the given id, or the primary display when there is none (or no id). */
export function resolveDisplay(displayId: number | undefined, label = "HUD"): Electron.Display {
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

export type HudKind = "meeting-bar" | "companion" | "annotation";

export const HUD_SIZES: Record<HudKind, { width: number; height: number }> = {
    annotation: { width: 1, height: 1 },
    // The pill, pinned to the bottom; the page grows the window when a panel opens. 100 high, not the pill's
    // 76: Chromium keeps a window a page resizes at least 100 high, so it could not come back to 76.
    "meeting-bar": { width: 680, height: 100 },
    // Interactive quick-access panel (People / Chat / Controls). Resizable; this is the initial size.
    companion: { width: 340, height: 480 },
};

const HUD_MARGIN = 24;

const hudWindows = new Map<HudKind, BrowserWindow>();

export function isHudWindowOpen(kind: HudKind): boolean {
    return getHudWindow(kind) !== undefined;
}

/** The live BrowserWindow for a HUD kind. */
export function getHudWindow(kind: HudKind): BrowserWindow | undefined {
    const window = hudWindows.get(kind);
    return window && !window.isDestroyed() ? window : undefined;
}

/** Where the meeting bar opens on a display: bottom-centre, like Zoom's control bar. */
export function meetingBarBounds(display: Electron.Display): Electron.Rectangle {
    const { width, height } = HUD_SIZES["meeting-bar"];
    const area = display.workArea;
    return {
        x: Math.round(area.x + (area.width - width) / 2),
        y: Math.round(area.y + area.height - height - HUD_MARGIN),
        width,
        height,
    };
}

/**
 * Everything a floating window gets once created: always on top on every workspace, bounds saved for
 * the companion, capture protection for the meeting bar.
 */
export function setUpHudWindow(kind: HudKind, newWindow: BrowserWindow): void {
    newWindow.setMenu(null);
    if (kind === "companion") {
        newWindow.setMinimumSize(COMPANION_MIN_WIDTH, COMPANION_MIN_HEIGHT);
        // Persist the resizable panel's bounds (debounced) so it reopens where the user left it.
        let boundsSaveTimer: ReturnType<typeof setTimeout> | undefined;
        const scheduleSaveBounds = () => {
            if (boundsSaveTimer !== undefined) {
                return;
            }
            boundsSaveTimer = setTimeout(() => {
                boundsSaveTimer = undefined;
                if (!newWindow.isDestroyed()) {
                    settings.set("companion_bounds", newWindow.getBounds());
                }
            }, 400);
        };
        newWindow.on("resize", scheduleSaveBounds);
        newWindow.on("move", scheduleSaveBounds);
    }
    // The meeting bar must stay out of the *shared* screen — viewers must not see the presenter's
    // own controls. The companion is a normal utility panel, only protected while the user shares
    // (companion-controller), so it can be screenshot otherwise. Protection is also lifted in
    // development / with WA_ALLOW_WINDOW_CAPTURE=1 so the bars can be captured (see content-protection).
    if (kind !== "companion" && shouldProtectWindowFromCapture()) {
        try {
            // Excluded from screen capture: the presenter sees the bar, viewers do NOT.
            newWindow.setContentProtection(true);
        } catch (error) {
            ElectronLog.warn(`HUD ${kind} setContentProtection failed`, error);
        }
    }
    try {
        // On macOS this call switches the app's process type, which briefly hides the app's windows and
        // Dock tiles. The companion opens right as WA gets minimized, whose Dock tile then went missing:
        // it skips the switch (and so does not show over full-screen apps). The meeting bar keeps it to
        // stay over a full-screen presentation.
        newWindow.setVisibleOnAllWorkspaces(true, {
            visibleOnFullScreen: true,
            skipTransformProcessType: kind === "companion",
        });
    } catch (error) {
        ElectronLog.debug(`HUD ${kind} setVisibleOnAllWorkspaces failed`, error);
    }
    try {
        // relativeLevel +1 lifts the HUD one layer above other "screen-saver" windows, so they cannot
        // land on top of it and absorb the presenter's clicks. macOS reads the relativeLevel; on
        // other platforms the second-layer bump is a no-op but the moveTop below still runs.
        newWindow.setAlwaysOnTop(true, "screen-saver", kind === "annotation" ? 0 : 1);
    } catch (error) {
        ElectronLog.debug(`HUD ${kind} setAlwaysOnTop failed`, error);
    }

    hudWindows.set(kind, newWindow);
    newWindow.on("closed", () => {
        if (hudWindows.get(kind) === newWindow) {
            hudWindows.delete(kind);
        }
    });

    // Never steal focus from the app the presenter is currently driving. moveTop: a window of the same
    // level created just before can otherwise sit above until the next window ordering event.
    if (kind === "annotation") newWindow.setIgnoreMouseEvents(true, { forward: true });
    newWindow.showInactive();
    newWindow.moveTop();
}

export function closeHudWindow(kind: HudKind): void {
    const window = getHudWindow(kind);
    hudWindows.delete(kind);
    window?.close();
}

export function closeAllHudWindows(): void {
    closeHudWindow("annotation");
    closeHudWindow("meeting-bar");
}
