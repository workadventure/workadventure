import { describe, expect, it } from "vitest";
import { shouldOpenNativePictureInPicture } from "./NativePictureInPictureClient";

describe("shouldOpenNativePictureInPicture", () => {
    const base = {
        nativeAvailable: true,
        allowedByUser: true,
        inActiveConversation: true,
        userAwayFromApp: false,
        userManuallyOpened: false,
    };

    it("never opens when native PiP is not available", () => {
        expect(
            shouldOpenNativePictureInPicture({
                ...base,
                nativeAvailable: false,
                userManuallyOpened: true,
                userAwayFromApp: true,
            }),
        ).toBe(false);
    });

    it("never opens when the user disabled PiP", () => {
        expect(
            shouldOpenNativePictureInPicture({
                ...base,
                allowedByUser: false,
                userAwayFromApp: true,
            }),
        ).toBe(false);
    });

    it("never opens when nobody else is in the conversation", () => {
        expect(
            shouldOpenNativePictureInPicture({
                ...base,
                inActiveConversation: false,
                userAwayFromApp: true,
            }),
        ).toBe(false);
    });

    it("opens automatically when user is away AND someone is in the meeting", () => {
        expect(shouldOpenNativePictureInPicture({ ...base, userAwayFromApp: true })).toBe(true);
    });

    it("opens when user manually requested PiP even if focused", () => {
        expect(shouldOpenNativePictureInPicture({ ...base, userManuallyOpened: true })).toBe(true);
    });

    it("does not open on user request when nobody else is in the meeting", () => {
        expect(
            shouldOpenNativePictureInPicture({
                ...base,
                userManuallyOpened: true,
                inActiveConversation: false,
            }),
        ).toBe(false);
    });

    it("stays closed when user is focused and did not request PiP", () => {
        expect(shouldOpenNativePictureInPicture(base)).toBe(false);
    });
});
