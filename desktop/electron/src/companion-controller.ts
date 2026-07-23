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
// True while the embedded meeting-video (PiP) is open — keeps the companion open even when WA is
// focused, so clicking back to the app doesn't kill the video (preserving the old "PiP stays alive").
let pipActive = false;

function isMainWindowFocused(): boolean {
    const mainWindow = getWindow();
    return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused());
}

function wantOpen(): boolean {
    const p = getPresenceSnapshot();
    // Screen sharing hard-hides the panel — the content-protected presenter HUD carries controls.
    if (p.screenSharing) {
        return false;
    }
    // Active meeting video (embedded PiP) keeps the companion open even when WA is focused, so
    // clicking back to the app doesn't tear down the video.
    if (pipActive) {
        return true;
    }
    if (isMainWindowFocused()) {
        return false;
    }
    // An incoming meeting invitation force-opens the panel even after a manual dismissal.
    if (p.invitationPending) {
        return true;
    }
    if (override === "force-open") {
        return true;
    }
    if (override === "force-closed") {
        return false;
    }
    // Auto-show while away inside a world (never on the landing / login page).
    return p.inWorld;
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

/**
 * The front is opening the meeting video (embedded PiP): make sure the companion is open and mark the
 * video active so the panel stays open (even focused) until it closes. The panel jumps to the Meeting
 * tab on its own, driven by the meeting state (inMeeting rising edge), so no explicit tab select here.
 */
export async function openCompanionForPip(): Promise<void> {
    pipActive = true;
    cancelPendingOpen();
    if (!isHudWindowOpen("companion")) {
        const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
        await openHudWindow("companion", display.id);
    }
}

/** The meeting video closed: drop the keep-open and re-evaluate the panel's visibility. */
export function closeCompanionPip(): void {
    if (!pipActive) {
        return;
    }
    pipActive = false;
    updateCompanion();
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
    // The embedded PiP view is a child of the companion window and dies with it.
    pipActive = false;
    closeHudWindow("companion");
}
