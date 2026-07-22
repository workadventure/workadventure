import { screen } from "electron";
import ElectronLog from "electron-log";
import { closeHudWindow, isHudWindowOpen, openHudWindow } from "./hud-windows";
import { getPresenceSnapshot, onPresenceChange } from "./presence";
import { getWindow } from "./window";

/**
 * Drives the unified Companion — the People / Chat / Meeting / Controls window shown whenever
 * WorkAdventure is backgrounded while the user is in a world. It never steals focus, closes when WA
 * regains focus, and (screen sharing aside) is the single floating surface. A tray/shortcut toggle
 * or the panel's own close button dismisses it for the current away-session; returning to the app
 * resets to auto. Screen sharing hides it in favour of the content-protected presenter HUD.
 */

type Override = "auto" | "force-open" | "force-closed";

// Auto-opens are debounced so a quick alt-tab away-and-back doesn't flash the panel. Manual opens
// skip the delay to stay responsive.
const OPEN_DEBOUNCE_MS = 400;

let started = false;
let opening = false;
let override: Override = "auto";
let openTimer: ReturnType<typeof setTimeout> | undefined;

function isMainWindowFocused(): boolean {
    const mainWindow = getWindow();
    return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused());
}

/**
 * Auto-show whenever the user is away (main window unfocused) inside a world, and not screen
 * sharing (there the presenter HUD carries the controls). Gated on `inWorld` so the panel never
 * pops on the landing / login page.
 */
function shouldAutoShow(): boolean {
    const p = getPresenceSnapshot();
    return !isMainWindowFocused() && !p.screenSharing && p.inWorld;
}

function wantOpen(): boolean {
    if (override === "force-open") {
        return true;
    }
    if (override === "force-closed") {
        return false;
    }
    return shouldAutoShow();
}

function cancelPendingOpen(): void {
    if (openTimer !== undefined) {
        clearTimeout(openTimer);
        openTimer = undefined;
    }
}

function performOpen(): void {
    // Re-check under current conditions — the debounce delay or the async open may have raced.
    if (opening || isHudWindowOpen("companion") || !wantOpen()) {
        return;
    }
    opening = true;
    // Open on the display the user is actually looking at (cursor), not necessarily WA's.
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    openHudWindow("companion", display.id)
        .then(() => {
            opening = false;
            // Conditions may have changed while we opened (refocus / share started / manual close).
            if (!wantOpen()) {
                closeHudWindow("companion");
            }
        })
        .catch((error) => {
            opening = false;
            ElectronLog.warn("Failed to open companion panel", error);
        });
}

export function updateCompanion(): void {
    // Returning to the app ends the away-session, so any manual dismissal / open reverts to auto.
    if (isMainWindowFocused()) {
        override = "auto";
    }

    const want = wantOpen();
    const isOpen = isHudWindowOpen("companion");

    if (!want) {
        cancelPendingOpen();
        if (isOpen) {
            closeHudWindow("companion");
        }
        return;
    }

    if (isOpen || opening || openTimer !== undefined) {
        return;
    }
    if (override === "force-open") {
        performOpen();
    } else {
        openTimer = setTimeout(() => {
            openTimer = undefined;
            performOpen();
        }, OPEN_DEBOUNCE_MS);
    }
}

/** Toggle from the tray / global shortcut: force the opposite of the current visibility. */
export function toggleCompanion(): void {
    override = isHudWindowOpen("companion") ? "force-closed" : "force-open";
    updateCompanion();
}

/**
 * Dismiss from the panel's own close button. Goes through the override (unlike a bare close) so the
 * panel stays closed for the rest of the away-session instead of re-opening on the next presence
 * change while still backgrounded.
 */
export function dismissCompanion(): void {
    override = "force-closed";
    updateCompanion();
}

export function isCompanionVisible(): boolean {
    return isHudWindowOpen("companion");
}

/** Start reacting to presence changes. Focus/blur updates are pushed in from window.ts. */
export function startCompanionController(): void {
    if (started) {
        return;
    }
    started = true;
    onPresenceChange(updateCompanion);
    updateCompanion();
}

/** Close the panel and reset to auto (used on tab switch and window teardown). */
export function stopCompanion(): void {
    cancelPendingOpen();
    override = "auto";
    closeHudWindow("companion");
}
