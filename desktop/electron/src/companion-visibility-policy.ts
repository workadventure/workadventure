export type CompanionOverride = "auto" | "force-open" | "force-closed";

export type CompanionVisibilityState = {
    /** WA shows: not minimized, hidden or fully covered. */
    mainWindowInView?: boolean;
    pipActive?: boolean;
    invitationPending?: boolean;
    inWorld?: boolean;
    autoOpenLatch?: boolean;
    /** False when the companion has nowhere to open by itself (see displayForAutoOpenDuringShare). */
    autoOpenAllowed?: boolean;
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
 *   2. the user is already in a meeting and WA stops showing: minimized, hidden, or fully covered
 *      (tracked on macOS and Windows only). Losing the focus is not leaving: WA keeps showing while
 *      the user works on another screen, or drags its window.
 * Anything else — walking around a world alone, tabbing out of an empty world — leaves the latch
 * down and the panel closed. Returning to the app, leaving the meeting, or leaving the world drops
 * the latch again, so each away-session needs a fresh trigger.
 *
 * Closing the panel (its close button, the window's own close, the tray) dismisses it until the
 * user comes back to WA (the controller lifts it on focus) or the meeting ends: neither trigger
 * brings it back meanwhile.
 *
 * Pure functions (no Electron dependency) so the rules can be unit-tested.
 */

/**
 * Decide the panel's visibility. Order matters: each rule below overrides the ones under it.
 */
export function shouldShowCompanion(state: CompanionVisibilityState): boolean {
    const s = state || {};
    // WA showing with no active meeting video keeping the panel alive → hide; the app has everything.
    if (s.mainWindowInView && !s.pipActive) {
        return false;
    }
    // An incoming meeting invitation force-opens the panel even after a manual dismissal.
    if (s.invitationPending) {
        return true;
    }
    // A dismissal (close button, window close, tray) wins over the keep-open and the auto-show:
    // closing the companion during a meeting tears down its embedded video, which is the intent.
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
    // Auto-show only inside a world, once a trigger has armed the latch, and where it may land.
    return Boolean(s.inWorld && s.autoOpenLatch && s.autoOpenAllowed !== false);
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
 * Fold WA ceasing to show into the latch: leaving the app *while in a meeting* is the second
 * trigger. Leaving outside a meeting must not arm it — that is the noise we removed.
 */
export function latchAfterLeavingApp(latch: boolean, presence: CompanionPresenceEdge): boolean {
    const p = presence || {};
    if (p.inWorld && p.inMeeting) {
        return true;
    }
    return Boolean(latch);
}

/**
 * A meeting that starts or ends, or leaving the world, lifts a dismissal (coming back to WA does
 * too, see the controller).
 */
export function dismissalAfterPresenceChange(
    dismissed: boolean,
    previous: CompanionPresenceEdge,
    next: CompanionPresenceEdge
): boolean {
    const before = previous || {};
    const after = next || {};
    if (!after.inWorld || Boolean(before.inMeeting) !== Boolean(after.inMeeting)) {
        return false;
    }
    return Boolean(dismissed);
}

/**
 * Where the companion may open by itself during the user's own screen share: on another screen than
 * the shared one, the one the user looks at if possible. With a single screen, or when the shared
 * screen is unknown (a window is shared, or the system share dialog chose it), nowhere: it would
 * land over what the user presents. Opening it by hand is not concerned.
 *
 * @param displayIds every screen
 * @param preferredDisplayId the screen under the pointer
 */
export function displayForAutoOpenDuringShare(
    displayIds: number[],
    sharedDisplayId: number | undefined,
    preferredDisplayId: number
): number | undefined {
    if (sharedDisplayId === undefined) {
        return undefined;
    }
    const others = (displayIds || []).filter((id) => id !== sharedDisplayId);
    if (others.length === 0) {
        return undefined;
    }
    return others.includes(preferredDisplayId) ? preferredDisplayId : others[0];
}

/**
 * True when presence just crossed from inside a world to outside it — the moment the panel should
 * close and every latch reset. Callers debounce this: `inWorld` also dips false during a same-world
 * scene reload (a portal hop), and tearing the panel down there would kill a live meeting video.
 */
export function leftWorld(previous: CompanionPresenceEdge, next: CompanionPresenceEdge): boolean {
    return Boolean(previous && previous.inWorld) && !(next && next.inWorld);
}
