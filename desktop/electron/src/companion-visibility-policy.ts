export type CompanionOverride = "auto" | "force-open" | "force-closed";

export type CompanionVisibilityState = {
    screenSharing?: boolean;
    /** False where no content-protected meeting bar can replace the panel during a share (Linux). */
    meetingBarAvailable?: boolean;
    mainWindowInView?: boolean;
    pipActive?: boolean;
    invitationPending?: boolean;
    inWorld?: boolean;
    autoOpenLatch?: boolean;
    override?: CompanionOverride;
};

export type CompanionPresenceEdge = {
    inWorld?: boolean;
    inMeeting?: boolean;
};

/**
 * Should the Companion panel be visible right now, and does a presence change arm the auto-show?
 *
 * The panel used to appear on *every* alt-tab away from a world, which made it noise. It now only
 * auto-opens on two deliberate triggers, both of which set a one-shot "latch":
 *   1. a bubble forms around the user (someone joined them), or
 *   2. the user is already in a meeting and leaves the app: focus goes to another window on WA's
 *      screen, or WA gets minimized or fully covered. Moving to another screen while WA keeps
 *      showing is not leaving.
 * Anything else — walking around a world alone, tabbing out of an empty world — leaves the latch
 * down and the panel closed. Returning to the app, leaving the meeting, or leaving the world drops
 * the latch again, so each away-session needs a fresh trigger.
 *
 * Pure functions (no Electron dependency) so the rules can be unit-tested.
 */

/**
 * Decide the panel's visibility. Order matters: each rule below overrides the ones under it.
 */
export function shouldShowCompanion(state: CompanionVisibilityState): boolean {
    const s = state || {};
    // Screen sharing hides the panel where the content-protected meeting bar carries the controls
    // instead. Without a meeting bar (Linux cannot keep it out of the capture), the panel stays.
    if (s.screenSharing && s.meetingBarAvailable !== false) {
        return false;
    }
    // WA in view (focused, or still showing on another screen) with no active meeting video keeping
    // it alive → hide; the app has everything.
    if (s.mainWindowInView && !s.pipActive) {
        return false;
    }
    // An incoming meeting invitation force-opens the panel even after a manual dismissal.
    if (s.invitationPending) {
        return true;
    }
    // A manual dismissal (close button / tray) wins over the keep-open and the auto-show: closing
    // the companion during a meeting tears down its embedded video, which is the intent.
    if (s.override === "force-closed") {
        return false;
    }
    // Active meeting video (embedded PiP) keeps the panel open even when WA is focused, so clicking
    // back to the app doesn't tear down the video.
    if (s.pipActive) {
        return true;
    }
    if (s.override === "force-open") {
        return true;
    }
    // Auto-show only inside a world, and only once a trigger has armed the latch.
    return Boolean(s.inWorld && s.autoOpenLatch);
}

/**
 * Fold a presence change into the auto-show latch.
 *
 * The bubble-forming trigger is the RISING edge of `inMeeting`: WA sets it the moment a bubble
 * closes around the user, which is precisely "someone joined me". Leaving the world or the meeting
 * disarms it, so a later alt-tab alone in a world does not reopen the panel.
 *
 * @param latch current latch
 * @param previous last presence seen
 * @param next presence just received
 * @returns the new latch
 */
export function latchAfterPresenceChange(
    latch: boolean,
    previous: CompanionPresenceEdge,
    next: CompanionPresenceEdge
): boolean {
    const before = previous || {};
    const after = next || {};
    // Left the world entirely (portal, landing, logout) → every trigger is stale.
    if (!after.inWorld) {
        return false;
    }
    // A bubble just formed around the user.
    if (after.inMeeting && !before.inMeeting) {
        return true;
    }
    // Meeting over → disarm, so merely being away in a world no longer shows the panel.
    if (!after.inMeeting) {
        return false;
    }
    return Boolean(latch);
}

/**
 * Fold a main-window blur into the latch: switching to another window *while in a meeting* is the
 * second trigger. Blurring outside a meeting must not arm it — that is the noise we removed.
 */
export function latchAfterMainWindowBlur(latch: boolean, presence: CompanionPresenceEdge): boolean {
    const p = presence || {};
    if (p.inWorld && p.inMeeting) {
        return true;
    }
    return Boolean(latch);
}

/**
 * Whether WA stays in view once it lost focus: the pointer went to another screen, so the user
 * moved there and WA keeps showing on its own. Where window positions are unknown (Wayland),
 * losing focus counts as leaving.
 */
export function staysInViewAfterBlur(blur: {
    knowsWindowPositions?: boolean;
    pointerDisplayId?: number;
    windowDisplayId?: number;
}): boolean {
    const b = blur || {};
    return Boolean(b.knowsWindowPositions) && b.pointerDisplayId !== b.windowDisplayId;
}

/**
 * True when presence just crossed from inside a world to outside it — the moment the panel should
 * close and every latch reset. Callers debounce this: `inWorld` also dips false during a same-world
 * scene reload (a portal hop), and tearing the panel down there would kill a live meeting video.
 */
export function leftWorld(previous: CompanionPresenceEdge, next: CompanionPresenceEdge): boolean {
    return Boolean(previous && previous.inWorld) && !(next && next.inWorld);
}
