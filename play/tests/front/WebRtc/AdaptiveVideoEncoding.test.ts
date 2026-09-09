import { describe, expect, it } from "vitest";
import {
    computeVideoEncoding,
    DEFAULT_VIEWER_DISPLAY,
    isViewerDisplayHidden,
} from "../../../src/front/WebRtc/AdaptiveVideoEncoding";

const capture = { width: 1280, height: 720 };
const selectPreset = (width: number, height: number) => ({ bitrate: width * height, fps: height >= 720 ? 30 : 15 });

describe("computeVideoEncoding", () => {
    it("stops the encoder when the viewer does not display the video", () => {
        expect(computeVideoEncoding({ width: 0, height: 0, maxBitrate: 0 }, capture, selectPreset)).toEqual({
            active: false,
        });
        expect(isViewerDisplayHidden({ width: 0, height: 0, maxBitrate: 0 })).toBe(true);
    });

    it("scales down to the displayed size", () => {
        expect(computeVideoEncoding({ width: 320, height: 180, maxBitrate: 0 }, capture, selectPreset)).toEqual({
            active: true,
            maxBitrate: 320 * 180,
            maxFramerate: 15,
            scaleResolutionDownBy: 4,
        });
    });

    it("never encodes more than the capture, and honours the viewer bandwidth limit", () => {
        expect(computeVideoEncoding({ width: 1920, height: 1080, maxBitrate: 100 }, capture, selectPreset)).toEqual({
            active: true,
            maxBitrate: 100,
            maxFramerate: 30,
            scaleResolutionDownBy: undefined,
        });
    });

    it("assumes a small tile until the viewer reports its size", () => {
        expect(isViewerDisplayHidden(DEFAULT_VIEWER_DISPLAY)).toBe(false);
        expect(computeVideoEncoding(DEFAULT_VIEWER_DISPLAY, capture, selectPreset)).toMatchObject({
            active: true,
            scaleResolutionDownBy: 4,
        });
    });
});
