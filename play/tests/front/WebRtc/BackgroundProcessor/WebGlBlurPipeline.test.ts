import { describe, expect, it } from "vitest";
import {
    getDualKawaseBlurLevels,
    getDualKawaseBlurOffset,
    getWebGlBlurSize,
} from "../../../../src/front/WebRtc/BackgroundProcessor/WebGlBlurPipeline";

describe("WebGlBlurPipeline helpers", () => {
    it("renders the blur at a reduced size that shrinks as the blur grows", () => {
        const lowBlurSize = getWebGlBlurSize(1280, 720, 10);
        const highBlurSize = getWebGlBlurSize(1280, 720, 50);

        expect(lowBlurSize.width).toBeLessThan(1280);
        expect(highBlurSize.width).toBeLessThan(lowBlurSize.width);
        expect(lowBlurSize.height / lowBlurSize.width).toBeCloseTo(720 / 1280, 1);
        expect(getWebGlBlurSize(0, 0, 10)).toEqual({ width: 0, height: 0, scale: 0 });
    });

    it("maps the blur levels to increasing Dual Kawase pass counts and offsets", () => {
        expect(getDualKawaseBlurLevels(10)).toBeLessThan(getDualKawaseBlurLevels(25));
        expect(getDualKawaseBlurLevels(25)).toBeLessThan(getDualKawaseBlurLevels(50));
        expect(getDualKawaseBlurOffset(10)).toBeLessThan(getDualKawaseBlurOffset(25));
        expect(getDualKawaseBlurOffset(25)).toBeLessThan(getDualKawaseBlurOffset(50));
    });
});
