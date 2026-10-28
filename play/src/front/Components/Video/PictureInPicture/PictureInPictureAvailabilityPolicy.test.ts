import { describe, expect, it } from "vitest";
import {
    hasPictureInPictureContent,
    isDocumentPictureInPictureSupported,
    usesPictureInPictureLayout,
} from "./PictureInPictureAvailabilityPolicy";

describe("PictureInPictureAvailabilityPolicy", () => {
    it("allows PiP when the user is in a remote conversation", () => {
        expect(hasPictureInPictureContent(true, 0)).toBe(true);
    });

    it("allows PiP when video content exists without a remote conversation", () => {
        expect(hasPictureInPictureContent(false, 1)).toBe(true);
    });

    it("rejects PiP when no conversation or video content exists", () => {
        expect(hasPictureInPictureContent(false, 0)).toBe(false);
    });

    it("detects Document Picture-in-Picture support with a simple feature check", () => {
        expect(
            isDocumentPictureInPictureSupported({ documentPictureInPicture: { requestWindow: () => undefined } }),
        ).toBe(true);
        expect(isDocumentPictureInPictureSupported({ documentPictureInPicture: {} })).toBe(false);
        expect(isDocumentPictureInPictureSupported({})).toBe(false);
    });

    it("gives the videos the picture-in-picture layout in the browser only", () => {
        expect(usesPictureInPictureLayout(true, false)).toBe(true);
        // The desktop companion mirrors the videos: the main window keeps its layout.
        expect(usesPictureInPictureLayout(true, true)).toBe(false);
        expect(usesPictureInPictureLayout(false, false)).toBe(false);
    });
});
