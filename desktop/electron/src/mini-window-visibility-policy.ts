/**
 * When the mini window (People / Chat / meeting video) opens and closes. The desktop app is the only
 * decider: the world page reports facts (someone else in the meeting, the "Allow picture-in-picture"
 * setting, a pending invitation) and shows the meeting video in the mini window when the app asks it to.
 *
 *   Automatic opening  Someone else is in the user's meeting or bubble, WA is considered left
 *                      (minimized, hidden, the focus left the app while the pointer was on WA's screen,
 *                      any focus loss under Wayland, or the page reported hidden), the setting is on,
 *                      and the user did not close it since they last came back to WA. Never while the
 *                      focus is in one of the app's own windows.
 *   Accepted false     An alt-tab longer than 400 ms (opens, closes on return); a click into a small
 *   positives          window while WA stays visible; switching apps with the keyboard while the
 *                      pointer sits on WA's screen, toward an app on another screen.
 *   Placement          During the user's own screen share: see share-surfaces-policy. Out of the
 *                      capture while sharing.
 *   Opening by hand    PiP button, tray, shortcut: always, on the screen under the pointer.
 *   Invitation         Opens it even after a close, whatever the setting; counts as automatic.
 *   Automatic closing  Opened by itself: WA shows again, or nobody else is left (the meeting ends, or
 *                      the user is alone in it), like the browser's picture-in-picture. Always:
 *                      leaving the world.
 *   Nobody else left   Opened by hand: it stays, and shows People / Chat once the meeting ends.
 *   Closing by hand    Close button, window close, tray, shortcut, PiP button: closed until the user
 *                      comes back to WA.
 *   Alone              Never by itself, in a meeting room or outside a meeting.
 *
 * Pure functions (no Electron dependency) so the rules can be unit-tested.
 */

export type MiniWindowMode = "closed" | "auto" | "manual";

export type MiniWindowState = {
    /** How the mini window currently open was opened. */
    opened?: "no" | "auto" | "manual";
    inWorld?: boolean;
    /** Someone else is in the user's meeting or bubble. */
    withOthers?: boolean;
    invitationPending?: boolean;
    /** The "Allow picture-in-picture" setting. */
    autoOpenAllowed?: boolean;
    /** WA shows: not minimized, hidden, left (focus) or page hidden. */
    waShowing?: boolean;
    /** Closed by the user since they last came back to WA. */
    dismissed?: boolean;
    /** Somewhere to open by itself (see miniWindowAutoOpenDisplay). */
    placeAvailable?: boolean;
};

export function miniWindowMode(s: MiniWindowState): MiniWindowMode {
    if (!s.inWorld) {
        return "closed";
    }
    if (s.opened === "manual") {
        return "manual";
    }
    if (s.waShowing) {
        return "closed";
    }
    if (s.invitationPending) {
        return "auto";
    }
    // Placement only matters for opening: an open mini window stays where it is.
    const canLand = s.opened === "auto" || Boolean(s.placeAvailable);
    if (s.withOthers && s.autoOpenAllowed && !s.dismissed && canLand) {
        return "auto";
    }
    return "closed";
}

/**
 * Does losing the focus to another application count as leaving WA? Yes when the pointer is on WA's
 * screen; no when it went to another screen, where WA keeps showing (a heuristic: switching with the
 * keyboard does not move the pointer). Under Wayland the pointer's screen is unknown, so it always
 * counts, and so does any unknown screen.
 */
export function leftOnBlur(blur: {
    positionsKnown?: boolean;
    pointerDisplayId?: number;
    waDisplayId?: number;
}): boolean {
    if (!blur.positionsKnown || blur.pointerDisplayId === undefined || blur.waDisplayId === undefined) {
        return true;
    }
    return blur.pointerDisplayId === blur.waDisplayId;
}
