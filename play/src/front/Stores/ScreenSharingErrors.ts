/**
 * Tells whether getDisplayMedia() failed because the user closed the browser's picker without choosing.
 *
 * Every browser rejects a cancelled picker with a NotAllowedError. Chrome uses the same error when the
 * operating system ("Permission denied by system", e.g. macOS screen recording not allowed) or a
 * permissions policy (an iframe without "display-capture") refuses, but then says so in the message:
 * those are real failures and must still be reported.
 */
export function isScreenSharingPickerCancelled(error: Error): boolean {
    return error.name === "NotAllowedError" && !/by system|policy/.test(error.message);
}
