/**
 * When the mini window (People / Chat / meeting video) opens and closes. The desktop app is the only
 * decider: the world page reports facts (someone else in the meeting, the "Allow picture-in-picture"
 * setting, a pending invitation) and shows the meeting video in the mini window when the app asks it to.
 *
 *   Automatic opening  Someone else is in the user's meeting or bubble, WA stops showing (minimized,
 *                      hidden, or fully covered: tracked on macOS and Windows; on Linux only
 *                      minimizing counts), the setting is on, and the user did not close it since they
 *                      last came back to WA.
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
    /** WA shows: not minimized, hidden or fully covered. */
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
