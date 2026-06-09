import { describe, expect, it } from "vitest";
import { getScreenSharingButtonState } from "./ScreenSharingMenuRules";

describe("getScreenSharingButtonState", () => {
    it("disables the screen sharing button when screen sharing is not activated", () => {
        expect(
            getScreenSharingButtonState({
                canBeRequested: true,
                requested: false,
                screenSharingActivated: false,
            }),
        ).toBe("disabled");
    });

    it("disables the screen sharing button when no current space allows screen share publishing", () => {
        expect(
            getScreenSharingButtonState({
                canBeRequested: false,
                requested: false,
                screenSharingActivated: true,
            }),
        ).toBe("disabled");
    });

    it("marks the screen sharing button active when publishing is allowed and requested", () => {
        expect(
            getScreenSharingButtonState({
                canBeRequested: true,
                requested: true,
                screenSharingActivated: true,
            }),
        ).toBe("active");
    });

    it("keeps the screen sharing button normal when publishing is allowed and not requested", () => {
        expect(
            getScreenSharingButtonState({
                canBeRequested: true,
                requested: false,
                screenSharingActivated: true,
            }),
        ).toBe("normal");
    });
});
