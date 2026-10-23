"use strict";

/**
 * What floats during the user's own screen share. The desktop app decides; the world page reports
 * facts (sharing, the shared screen or window, and later the drawing mode).
 *
 *   Meeting bar        Whenever the user shares from the app, on macOS and Windows (out of the
 *                      capture): on the shared screen, or the screen under the pointer when a window
 *                      is shared. It follows a change of shared screen. None on Linux.
 *   Companion          Opens by itself during a share only on another screen than the shared one
 *                      (none with a single screen, or when the shared screen is unknown), and never
 *                      on Linux, where it cannot be kept out of the capture. Opened by hand it stays,
 *                      and on Linux it warns it is visible in the share.
 *   Annotation overlay Over the shared screen while the user draws on their share or uses a
 *                      presenter tool (laser, spotlight, loupe), out of the capture: a whole screen
 *                      on macOS and Windows only. Another shared screen closes it; the world clears
 *                      the annotations.
 *   Identify screens   Nothing opens by itself while its windows cover every screen.
 *
 * Pure functions (no Electron dependency) so the rules can be unit-tested.
 */

/**
 * The screen the meeting bar goes on, or undefined for no bar.
 *
 * @param {{ canHideFromCapture: boolean, sharing: boolean, sharedDisplayId?: number, pointerDisplayId: number }} s
 * @returns {number | undefined}
 */
function meetingBarDisplay(s) {
    if (!s.canHideFromCapture || !s.sharing) {
        return undefined;
    }
    return s.sharedDisplayId ?? s.pointerDisplayId;
}

/**
 * The screen the companion may open on by itself, or undefined for nowhere.
 *
 * @param {{
 *   canHideFromCapture: boolean,
 *   sharing: boolean,
 *   identifyingScreens: boolean,
 *   displayIds: number[],
 *   sharedDisplayId?: number,
 *   pointerDisplayId: number,
 * }} s
 * @returns {number | undefined}
 */
function companionAutoOpenDisplay(s) {
    if (s.identifyingScreens) {
        return undefined;
    }
    if (!s.sharing) {
        return s.pointerDisplayId;
    }
    if (!s.canHideFromCapture || s.sharedDisplayId === undefined) {
        return undefined;
    }
    const others = (s.displayIds || []).filter((id) => id !== s.sharedDisplayId);
    if (others.length === 0) {
        return undefined;
    }
    return others.includes(s.pointerDisplayId) ? s.pointerDisplayId : others[0];
}

/**
 * The companion warns it shows in the user's share where it cannot be kept out of the capture.
 *
 * @param {boolean} canHideFromCapture
 * @param {boolean} sharing
 * @returns {boolean}
 */
function companionVisibleInShare(canHideFromCapture, sharing) {
    return sharing && !canHideFromCapture;
}

/**
 * The screen the annotation overlay covers, or undefined for no overlay.
 *
 * @param {{
 *   canHideFromCapture: boolean,
 *   sharing: boolean,
 *   sharedDisplayId?: number, // undefined when a window is shared
 *   drawing: boolean,
 *   presenterTool: boolean,
 * }} s
 * @returns {number | undefined}
 */
function annotationOverlayDisplay(s) {
    if (!s.canHideFromCapture || !s.sharing || s.sharedDisplayId === undefined) {
        return undefined;
    }
    return s.drawing || s.presenterTool ? s.sharedDisplayId : undefined;
}

module.exports = { meetingBarDisplay, companionAutoOpenDisplay, companionVisibleInShare, annotationOverlayDisplay };
