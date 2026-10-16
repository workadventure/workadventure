/**
 * Tells whether getDisplayMedia() failed because the user closed the browser's picker without choosing.
 *
 * Every browser rejects a cancelled picker with a NotAllowedError. Chrome uses the same error when the
 * operating system ("Permission denied by system", e.g. macOS screen recording not allowed) or a
 * permissions policy (an iframe without "display-capture") refuses, but then says so in the message:
 * those are real failures and must still be reported.
 *
 * The desktop app refuses a share whose system dialog was closed (Linux under Wayland) with an
 * AbortError, which a browser keeps for capture failures: it only counts as a cancel there.
 */
export function isScreenSharingPickerCancelled(error: Error, inDesktopApp = false): boolean {
    if (inDesktopApp && error.name === "AbortError") {
        return true;
    }
    return error.name === "NotAllowedError" && !/by system|policy/.test(error.message);
}
