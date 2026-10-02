import { describe, expect, it } from "vitest";
import {
    BUTTON_ZOOM_FACTOR_PER_SECOND,
    CONTINUOUS_BUTTON_ZOOM_STEP_DURATION,
    SMOOTH_BUTTON_ZOOM_DURATION,
    getContinuousButtonZoomFactor,
    getRetargetedButtonZoomModifier,
    getSmoothButtonZoomModifier,
} from "./CameraZoomUtils";

describe("CameraZoomUtils", () => {
    it("retargets repeated button zooms from the existing target", () => {
        expect(getRetargetedButtonZoomModifier(1, 1.2, undefined)).toBeCloseTo(1.2);
        expect(getRetargetedButtonZoomModifier(1.05, 1.2, 1.2)).toBeCloseTo(1.44);
    });

    it("moves smoothly toward the target without overshooting", () => {
        const currentZoomModifier = 1;
        const targetZoomModifier = 1.2;

        const nextZoomModifier = getSmoothButtonZoomModifier(
            currentZoomModifier,
            targetZoomModifier,
            SMOOTH_BUTTON_ZOOM_DURATION / 2,
        );

        expect(nextZoomModifier).toBeGreaterThan(currentZoomModifier);
        expect(nextZoomModifier).toBeLessThan(targetZoomModifier);
    });

    it("does not jump aggressively on the first animation frame", () => {
        expect(getSmoothButtonZoomModifier(1, 1.2, 16)).toBeLessThan(1.03);
    });

    it("keeps a moderate continuous zoom speed", () => {
        expect(
            getContinuousButtonZoomFactor(BUTTON_ZOOM_FACTOR_PER_SECOND, CONTINUOUS_BUTTON_ZOOM_STEP_DURATION),
        ).toBeCloseTo(1.2);
    });
});
