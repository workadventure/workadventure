import { describe, expect, it } from "vitest";
import { isScreenSharingPickerCancelled } from "./ScreenSharingErrors";

function domError(name: string, message: string): Error {
    const error = new Error(message);
    error.name = name;
    return error;
}

describe("isScreenSharingPickerCancelled", () => {
    it("treats a closed picker as a cancel, in Chrome, Firefox and Safari", () => {
        expect(isScreenSharingPickerCancelled(domError("NotAllowedError", "Permission denied"))).toBe(true);
        expect(
            isScreenSharingPickerCancelled(
                domError(
                    "NotAllowedError",
                    "The request is not allowed by the user agent or the platform in the current context.",
                ),
            ),
        ).toBe(true);
        expect(
            isScreenSharingPickerCancelled(
                domError(
                    "NotAllowedError",
                    "The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission.",
                ),
            ),
        ).toBe(true);
    });

    it("still reports a refusal by the operating system or a permissions policy", () => {
        expect(isScreenSharingPickerCancelled(domError("NotAllowedError", "Permission denied by system"))).toBe(false);
        expect(
            isScreenSharingPickerCancelled(
                domError(
                    "NotAllowedError",
                    'Access to the feature "display-capture" is disallowed by permissions policy.',
                ),
            ),
        ).toBe(false);
    });

    it("still reports other errors", () => {
        expect(isScreenSharingPickerCancelled(domError("NotReadableError", "Could not start video source"))).toBe(
            false,
        );
        expect(isScreenSharingPickerCancelled(new Error("Your browser does not support sharing screen"))).toBe(false);
    });
});
