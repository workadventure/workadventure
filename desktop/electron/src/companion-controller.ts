import { screen } from "electron";
import ElectronLog from "electron-log";
import { closeHudWindow, isHudWindowOpen, openHudWindow } from "./hud-windows";
import { getPresenceSnapshot, onPresenceChange } from "./presence";
import { getWindow } from "./window";
import {
    latchAfterMainWindowBlur,
    latchAfterPresenceChange,
    leftWorld,
    shouldShowCompanion,
} from "./companion-visibility-policy";

/**
 * Drives the unified Companion — the People / Chat / Meeting / Controls window. It never steals
 * focus and (screen sharing aside) is the single floating surface. A tray/shortcut toggle or the
 * panel's own close button dismisses it for the current away-session; returning to the app resets
 * to auto. Screen sharing hides it in favour of the content-protected presenter HUD.
 *
 * It does NOT simply appear whenever WA is backgrounded — that made it noise. Two deliberate
 * triggers arm a one-shot latch (see companion-visibility-policy): a bubble forming around the
 * user, or switching away from the app while already in a meeting. Leaving the world closes the
 * panel and disarms everything, so each away-session needs a fresh trigger.
 */

type Override = "auto" | "force-open" | "force-closed";

// Auto-opens are debounced so a quick alt-tab away-and-back doesn't flash the panel. Manual opens
// skip the delay to stay responsive.
const OPEN_DEBOUNCE_MS = 400;
// `inWorld` also dips false while a same-world scene reloads (a portal hop), so the leaving-a-world
// teardown waits this long to be contradicted. Without it every portal would kill a live meeting.
const LEAVE_WORLD_GRACE_MS = 1500;

let started = false;
let opening = false;
let override: Override = "auto";
let openTimer: ReturnType<typeof setTimeout> | undefined;
let leaveWorldTimer: ReturnType<typeof setTimeout> | undefined;
// True while the embedded meeting-video (PiP) is open — keeps the companion open even when WA is
// focused, so clicking back to the app doesn't kill the video (preserving the old "PiP stays alive").
let pipActive = false;
// One-shot arming for the auto-show; see the module comment.
let autoOpenLatch = false;
// Last presence seen, so presence callbacks can compute rising / falling edges.
let lastPresence = { inWorld: false, inMeeting: false };

function isMainWindowFocused(): boolean {
    const mainWindow = getWindow();
    return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused());
}

function wantOpen(): boolean {
    const p = getPresenceSnapshot();
    return shouldShowCompanion({
        screenSharing: p.screenSharing,
        mainWindowFocused: isMainWindowFocused(),
        pipActive,
        invitationPending: p.invitationPending,
        inWorld: p.inWorld,
        autoOpenLatch,
        override,
    });
}

function cancelPendingOpen(): void {
    if (openTimer !== undefined) {
        clearTimeout(openTimer);
        openTimer = undefined;
    }
}

function cancelPendingLeaveWorld(): void {
    if (leaveWorldTimer !== undefined) {
        clearTimeout(leaveWorldTimer);
        leaveWorldTimer = undefined;
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

/**
 * Fold a presence push into the latch, then re-evaluate. Edges have to be computed here, before
 * `updateCompanion()`, because the snapshot alone cannot tell "a bubble just formed" from "still in
 * the same meeting".
 */
function handlePresenceChange(): void {
    const p = getPresenceSnapshot();
    const next = { inWorld: p.inWorld, inMeeting: p.inMeeting };

    if (leftWorld(lastPresence, next)) {
        // Debounced: a portal hop briefly drops inWorld too, and tearing down there would kill a
        // live meeting video. If the world comes back before the timer fires, nothing happens.
        cancelPendingLeaveWorld();
        leaveWorldTimer = setTimeout(() => {
            leaveWorldTimer = undefined;
            if (getPresenceSnapshot().inWorld) {
                return;
            }
            // Left for real (world change, landing, logout): close and disarm, so the panel only
            // returns on a fresh trigger in whatever world comes next.
            autoOpenLatch = false;
            lastPresence = { inWorld: false, inMeeting: false };
            stopCompanion();
        }, LEAVE_WORLD_GRACE_MS);
    } else if (next.inWorld) {
        cancelPendingLeaveWorld();
    }

    autoOpenLatch = latchAfterPresenceChange(autoOpenLatch, lastPresence, next);
    lastPresence = next;
    updateCompanion();
}

/**
 * The main window lost focus. Switching to another window *while in a meeting* is the second
 * auto-show trigger; blurring outside a meeting deliberately does nothing.
 */
export function onMainWindowBlur(): void {
    const p = getPresenceSnapshot();
    autoOpenLatch = latchAfterMainWindowBlur(autoOpenLatch, { inWorld: p.inWorld, inMeeting: p.inMeeting });
    updateCompanion();
}

/** The main window regained focus: the away-session is over, so disarm and revert any override. */
export function onMainWindowFocus(): void {
    autoOpenLatch = false;
    updateCompanion();
}

export function updateCompanion(): void {
    // Returning to the app ends the away-session, so any manual dismissal / open reverts to auto.
    if (isMainWindowFocused()) {
        override = "auto";
        autoOpenLatch = false;
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
    // Drop the trigger too, so the next presence push doesn't immediately undo the dismissal.
    autoOpenLatch = false;
    updateCompanion();
}

export function isCompanionVisible(): boolean {
    return isHudWindowOpen("companion");
}

/**
 * The front is opening the meeting video: make sure the companion is open and mark the video active
 * so the panel stays open (even when WA is focused) until it closes. The companion renderer switches
 * its own layout to the video-first view on the inMeeting rising edge, so there is nothing to select
 * here — awaiting the open guarantees the renderer is ready before the WA renderer's first SDP offer.
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
    const p = getPresenceSnapshot();
    lastPresence = { inWorld: p.inWorld, inMeeting: p.inMeeting };
    onPresenceChange(handlePresenceChange);
    updateCompanion();
}

/** Close the panel and reset to auto (used on tab switch, world change and window teardown). */
export function stopCompanion(): void {
    cancelPendingOpen();
    cancelPendingLeaveWorld();
    override = "auto";
    // A fresh trigger is required after a teardown; otherwise the panel would pop straight back on
    // the next presence push in the new world / tab.
    autoOpenLatch = false;
    // The meeting video lives in the companion renderer, so it dies with the window.
    pipActive = false;
    closeHudWindow("companion");
}
