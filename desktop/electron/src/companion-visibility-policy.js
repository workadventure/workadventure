"use strict";

/**
 * When the Companion (People / Chat / meeting video) opens and closes. The desktop app is the only
 * decider: the world page reports facts (in a meeting, the "Allow picture-in-picture" setting, a
 * pending invitation) and shows the meeting video in the companion when the app asks it to.
 *
 *   Automatic opening  In a meeting, WA stops showing (minimized, hidden, or fully covered: tracked
 *                      on macOS and Windows; on Linux only minimizing counts), the setting is on, and
 *                      the user did not close it since they last came back to WA.
 *   Placement          During the user's own screen share: see share-surfaces-policy. Out of the
 *                      capture while sharing.
 *   Opening by hand    PiP button, tray, shortcut: always, on the screen under the pointer.
 *   Invitation         Opens it even after a close, whatever the setting; counts as automatic.
 *   Automatic closing  Opened by itself: WA shows again, or the meeting ends. Always: leaving the
 *                      world.
 *   Meeting ends       Opened by hand: it stays and shows People / Chat.
 *   Closing by hand    Close button, window close, tray, shortcut, PiP button: closed until the user
 *                      comes back to WA.
 *   Outside a meeting  Never by itself.
 *
 * Pure functions (no Electron dependency) so the rules can be unit-tested.
 */

/**
 * @param {{
 *   opened?: "no" | "auto" | "manual", // how the companion currently open was opened
 *   inWorld?: boolean,
 *   inMeeting?: boolean,
 *   invitationPending?: boolean,
 *   autoOpenAllowed?: boolean, // the "Allow picture-in-picture" setting
 *   waShowing?: boolean,
 *   dismissed?: boolean, // closed by the user since they last came back to WA
 *   placeAvailable?: boolean, // somewhere to open by itself (see companionAutoOpenDisplay)
 * }} state
 * @returns {"closed" | "auto" | "manual"}
 */
function companionMode(state) {
    const s = state || {};
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
    // Placement only matters for opening: an open companion stays where it is.
    const canLand = s.opened === "auto" || Boolean(s.placeAvailable);
    if (s.inMeeting && s.autoOpenAllowed && !s.dismissed && canLand) {
        return "auto";
    }
    return "closed";
}

module.exports = {
    companionMode,
};
