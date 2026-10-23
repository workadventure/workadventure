import { describe, expect, it } from "vitest";
import { selectPictureInPictureHighlight } from "./PictureInPictureHighlightPolicy";

describe("selectPictureInPictureHighlight", () => {
    const fallback = { uniqueId: "camera" };
    const screenShare = { uniqueId: "screen-share" };

    it("keeps the fallback highlight outside PiP", () => {
        expect(selectPictureInPictureHighlight(false, true, [screenShare], fallback)).toBe(fallback);
    });

    it("keeps the fallback highlight when PiP is not active", () => {
        expect(selectPictureInPictureHighlight(true, false, [screenShare], fallback)).toBe(fallback);
    });

    it("uses the first screen share when PiP is active", () => {
        expect(selectPictureInPictureHighlight(true, true, [screenShare], fallback)).toBe(screenShare);
    });

    it("keeps the fallback highlight when there is no active screen share", () => {
        expect(selectPictureInPictureHighlight(true, true, [], fallback)).toBe(fallback);
    });
});
