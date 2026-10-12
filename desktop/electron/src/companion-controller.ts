import { screen, type BrowserWindow } from "electron";
import ElectronLog from "electron-log";
import { closeHudWindow, getHudWindow, isHudWindowOpen, openHudWindow } from "./hud-windows";
import { getPresenceSnapshot, onPresenceChange } from "./presence";
import { getWindow } from "./window";
import {
    dismissalAfterPresenceChange,
    latchAfterLeavingApp,
    latchAfterPresenceChange,
    leftWorld,
    shouldShowCompanion,
} from "./companion-visibility-policy";
import { canHideWindowsFromCapture } from "./platform-capture-policy";

/**
 * Drives the unified Companion — the People / Chat / Meeting / Controls window. It never steals
 * focus and (screen sharing aside) is the single floating surface. Closing it (its close button,
 * the window's own close, the tray/shortcut toggle) dismisses it until the meeting ends. Screen
 * sharing hides it in favour of the content-protected presenter HUD.
 *
 * It does NOT simply appear whenever WA is backgrounded — that made it noise. Two deliberate
 * triggers arm a one-shot latch (see companion-visibility-policy): a bubble forming around the
 * user, or WA ceasing to show (minimized, hidden, fully covered) while already in a meeting.
 * Losing the focus is not leaving. Leaving the world closes the panel and disarms everything, so
 * each away-session needs a fresh trigger.
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
// The world page is hidden: WA fully covered (tracked on macOS and Windows) or minimized.
let pageHidden = false;
// Closed by the user: stays closed until the meeting ends (see dismissalAfterPresenceChange).
let dismissed = false;
// Companion windows closed by this controller, as opposed to by the user (window close shortcut).
const closedByController = new WeakSet<BrowserWindow>();
const watchedWindows = new WeakSet<BrowserWindow>();

function isMainWindowFocused(): boolean {
    const mainWindow = getWindow();
    return Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused());
}

function isMainWindowShowing(): boolean {
    const mainWindow = getWindow();
    return (
        Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() && !mainWindow.isMinimized()) &&
        !pageHidden
    );
}

function wantOpen(): boolean {
    const p = getPresenceSnapshot();
    return shouldShowCompanion({
        screenSharing: p.screenSharing,
        // The meeting bar replaces the panel while sharing, where it can be kept out of the capture.
        meetingBarAvailable: canHideWindowsFromCapture(process.platform),
        mainWindowInView: isMainWindowShowing(),
        pipActive,
        invitationPending: p.invitationPending,
        inWorld: p.inWorld,
        autoOpenLatch,
        override: dismissed ? "force-closed" : override,
    });
}

function closeCompanionWindow(): void {
    const companion = getHudWindow("companion");
    if (companion) {
        closedByController.add(companion);
    }
    closeHudWindow("companion");
}

/** The user closing the window themselves (close shortcut) dismisses it like its close button. */
function watchUserClose(): void {
    const companion = getHudWindow("companion");
    if (!companion || watchedWindows.has(companion)) {
        return;
    }
    watchedWindows.add(companion);
    companion.once("closed", () => {
        if (!closedByController.has(companion)) {
            dismiss();
        }
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
            watchUserClose();
            // Conditions may have changed while we opened (refocus / share started / manual close).
            if (!wantOpen()) {
                closeCompanionWindow();
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
    dismissed = dismissalAfterPresenceChange(dismissed, lastPresence, next);
    lastPresence = next;
    updateCompanion();
}

/** The main window got minimized or hidden: WA stops showing, the second auto-show trigger. */
export function onMainWindowHidden(): void {
    leaveApp();
    updateCompanion();
}

/**
 * The world page went hidden (WA minimized, or fully covered: tracked on macOS and Windows) or
 * showed again. A page hidden in a focused window is a tab switch inside WA, not leaving it.
 */
export function onPageVisibilityChange(hidden: boolean): void {
    if (hidden && isMainWindowFocused()) {
        return;
    }
    pageHidden = hidden;
    if (hidden) {
        leaveApp();
    }
    updateCompanion();
}

function leaveApp(): void {
    const p = getPresenceSnapshot();
    autoOpenLatch = latchAfterLeavingApp(autoOpenLatch, { inWorld: p.inWorld, inMeeting: p.inMeeting });
}

/** The main window regained focus: the away-session is over, so disarm and revert any override. */
export function onMainWindowFocus(): void {
    autoOpenLatch = false;
    pageHidden = false;
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
            closeCompanionWindow();
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

/** Toggle from the tray / global shortcut: closing dismisses, opening lifts the dismissal. */
export function toggleCompanion(): void {
    if (isHudWindowOpen("companion")) {
        dismissCompanion();
        return;
    }
    dismissed = false;
    override = "force-open";
    updateCompanion();
}

/**
 * Dismiss from the panel's own close button: the panel stays closed until the meeting ends instead
 * of re-opening on the next trigger.
 */
export function dismissCompanion(): void {
    dismiss();
    updateCompanion();
}

function dismiss(): void {
    dismissed = true;
    override = "auto";
    autoOpenLatch = false;
    // The meeting video lives in the companion renderer, so it dies with the window.
    pipActive = false;
}

export function isCompanionVisible(): boolean {
    return isHudWindowOpen("companion");
}

/**
 * The front is opening the meeting video: make sure the companion is open and mark the video active
 * so the panel stays open (even when WA is focused) until it closes. The companion renderer switches
 * its own layout to the video-first view on the inMeeting rising edge, so there is nothing to select
 * here — awaiting the open guarantees the renderer is ready before the WA renderer's first SDP offer.
 * A dismissed companion only reopens when the user asks for the video, not when the front opens it
 * by itself.
 */
export async function openCompanionForPip(userRequested: boolean): Promise<void> {
    if (dismissed && !userRequested) {
        return;
    }
    dismissed = false;
    pipActive = true;
    cancelPendingOpen();
    if (!isHudWindowOpen("companion")) {
        const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
        await openHudWindow("companion", display.id);
        watchUserClose();
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

/** Start reacting to presence changes. Focus and visibility updates are pushed in from window.ts and ipc.ts. */
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
    dismissed = false;
    closeCompanionWindow();
}
