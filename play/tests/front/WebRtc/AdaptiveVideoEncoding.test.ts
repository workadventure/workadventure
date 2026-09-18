import { describe, expect, it } from "vitest";
import {
    computeVideoEncoding,
    DEFAULT_VIEWER_DISPLAY,
    evenScaleFactor,
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

    it("keeps the scaled frame even-sized, whether the browser truncates or rounds", () => {
        // 1280x720 / 5.0996 would be 251x141, which stalls Firefox's VP9 encoder
        const encoding = computeVideoEncoding({ width: 251, height: 141, maxBitrate: 0 }, capture, selectPreset);
        const scale = encoding.scaleResolutionDownBy ?? 1;
        expect(Math.floor(capture.width / scale) % 2).toBe(0);
        expect(Math.floor(capture.height / scale) % 2).toBe(0);
        expect(Math.round(capture.width / scale)).toBe(Math.floor(capture.width / scale));
        expect(Math.round(capture.height / scale)).toBe(Math.floor(capture.height / scale));
        // 250x140 has no scale that both browsers agree on, 246x138 is the nearest frame that has one
        expect(Math.floor(capture.width / scale)).toBe(246);
        expect(Math.floor(capture.height / scale)).toBe(138);
    });

    it("assumes a small tile until the viewer reports its size", () => {
        expect(isViewerDisplayHidden(DEFAULT_VIEWER_DISPLAY)).toBe(false);
        expect(computeVideoEncoding(DEFAULT_VIEWER_DISPLAY, capture, selectPreset)).toMatchObject({
            active: true,
            scaleResolutionDownBy: 4,
        });
    });
});

describe("evenScaleFactor", () => {
    const captures = [
        { width: 1280, height: 720 },
        { width: 1920, height: 1080 },
        { width: 640, height: 480 },
        { width: 960, height: 540 },
    ];

    it("keeps an already even scale untouched", () => {
        expect(evenScaleFactor({ width: 1280, height: 720 }, 4)).toBe(4);
        expect(evenScaleFactor({ width: 1280, height: 720 }, 2)).toBe(2);
    });

    it("lands on even truncated and rounded dimensions for any tile, never larger than the tile", () => {
        let maxDrop = 0;
        for (const capture of captures) {
            for (let tileWidth = 40; tileWidth <= capture.width; tileWidth += 7) {
                const tileHeight = Math.round((tileWidth * 9) / 16);
                const minScale = Math.max(1, Math.min(capture.width / tileWidth, capture.height / tileHeight));
                if (minScale <= 1) {
                    continue;
                }
                const scale = evenScaleFactor(capture, minScale);
                const width = capture.width / scale;
                const height = capture.height / scale;
                expect(
                    scale,
                    `${capture.width}x${capture.height} for ${tileWidth}x${tileHeight}`,
                ).toBeGreaterThanOrEqual(minScale);
                expect(Math.floor(width) % 2).toBe(0);
                expect(Math.floor(height) % 2).toBe(0);
                expect(Math.round(width)).toBe(Math.floor(width));
                expect(Math.round(height)).toBe(Math.floor(height));
                maxDrop = Math.max(
                    maxDrop,
                    Math.floor(capture.width / minScale) - Math.floor(width),
                    Math.floor(capture.height / minScale) - Math.floor(height),
                );
            }
        }
        // Under ten pixels smaller than the odd frame it replaces (measured: 9, on a 1080p capture)
        expect(maxDrop).toBeLessThanOrEqual(10);
    });

    it("keeps the e2e tile of 223x125 at 124 high", () => {
        const scale = evenScaleFactor({ width: 1280, height: 720 }, Math.min(1280 / 223, 720 / 125));
        expect(Math.floor(720 / scale)).toBe(124);
        expect(Math.floor(1280 / scale)).toBe(220);
    });
});
