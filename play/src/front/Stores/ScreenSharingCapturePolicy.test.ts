import { describe, expect, it } from "vitest";
import { selectScreenSharingCaptureMethod } from "./ScreenSharingCapturePolicy";

describe("selectScreenSharingCaptureMethod", () => {
    it("prefers the desktop capturer when the desktop API is available", () => {
        expect(selectScreenSharingCaptureMethod({ hasDesktopCapturer: true, hasDisplayMedia: true })).toBe("desktop");
    });

    it("uses getDisplayMedia when the desktop capturer is unavailable", () => {
        expect(selectScreenSharingCaptureMethod({ hasDesktopCapturer: false, hasDisplayMedia: true })).toBe(
            "display-media",
        );
    });

    it("returns unsupported when no capture API is available", () => {
        expect(selectScreenSharingCaptureMethod({ hasDesktopCapturer: false, hasDisplayMedia: false })).toBe(
            "unsupported",
        );
    });
});
