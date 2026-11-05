import { expect, test } from "vitest";
import {
    COMPANION_MIN_WIDTH,
    COMPANION_MIN_HEIGHT,
    companionPlacement,
    normalizeCompanionBounds,
} from "./companion-window-policy";

const workArea = { x: 0, y: 0, width: 1440, height: 900 };
const fullHd = { x: 0, y: 0, width: 1920, height: 1040 };
const uhd = { x: 0, y: 0, width: 3840, height: 2120 };

test("defaults to a bottom-right rectangle when no placement was saved", () => {
    const bounds = normalizeCompanionBounds(undefined, workArea, { width: 420, height: 560 }, 24);
    expect(bounds).toStrictEqual({ x: 1440 - 420 - 24, y: 900 - 560 - 24, width: 420, height: 560 });
});

test("reopens where it was left on the same screen", () => {
    const left = { x: 100, y: 80, width: 500, height: 600 };
    expect(normalizeCompanionBounds(companionPlacement(left, workArea), workArea)).toStrictEqual(left);
});

test("stays in the bottom-right corner on a bigger screen", () => {
    const corner = { x: 1920 - 340, y: 1040 - 480, width: 340, height: 480 };
    expect(normalizeCompanionBounds(companionPlacement(corner, fullHd), uhd)).toStrictEqual({
        x: 3840 - 340,
        y: 2120 - 480,
        width: 340,
        height: 480,
    });
});

test("keeps its spot on a screen at another origin", () => {
    const leftScreenCorner = { x: 1920 - 340, y: 1040 - 480, width: 340, height: 480 };
    const rightScreen = { x: 1920, y: 0, width: 1920, height: 1040 };
    expect(normalizeCompanionBounds(companionPlacement(leftScreenCorner, fullHd), rightScreen)).toStrictEqual({
        x: 1920 + 1920 - 340,
        y: 1040 - 480,
        width: 340,
        height: 480,
    });
});

test("keeps a centred panel centred", () => {
    const centred = { x: (1920 - 340) / 2, y: (1040 - 480) / 2, width: 340, height: 480 };
    expect(normalizeCompanionBounds(companionPlacement(centred, fullHd), uhd)).toStrictEqual({
        x: (3840 - 340) / 2,
        y: (2120 - 480) / 2,
        width: 340,
        height: 480,
    });
});

test("shrinks an oversized panel and keeps out-of-range ratios on-screen", () => {
    expect(
        normalizeCompanionBounds(
            { xRatio: -2, yRatio: 5, width: 900, height: 100 },
            { x: 0, y: 0, width: 800, height: 600 }
        )
    ).toStrictEqual({ x: 0, y: 240, width: 800, height: COMPANION_MIN_HEIGHT });
});

test("never returns a rectangle below the minimum size", () => {
    const bounds = normalizeCompanionBounds({ xRatio: 0, yRatio: 0, width: 50, height: 50 }, workArea);
    expect(bounds.width).toBe(COMPANION_MIN_WIDTH);
    expect(bounds.height).toBe(COMPANION_MIN_HEIGHT);
});
