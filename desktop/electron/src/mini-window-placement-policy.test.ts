import { expect, test } from "vitest";
import {
    MINI_WINDOW_MIN_WIDTH,
    MINI_WINDOW_MIN_HEIGHT,
    miniWindowPlacement,
    normalizeMiniWindowBounds,
} from "./mini-window-placement-policy";

const workArea = { x: 0, y: 0, width: 1440, height: 900 };
const fullHd = { x: 0, y: 0, width: 1920, height: 1040 };
const uhd = { x: 0, y: 0, width: 3840, height: 2120 };

test("defaults to a bottom-right rectangle when no placement was saved", () => {
    const bounds = normalizeMiniWindowBounds(undefined, workArea, { width: 420, height: 560 }, 24);
    expect(bounds).toStrictEqual({ x: 1440 - 420 - 24, y: 900 - 560 - 24, width: 420, height: 560 });
});

test("reopens where it was left on the same screen", () => {
    const left = { x: 100, y: 80, width: 500, height: 600 };
    expect(normalizeMiniWindowBounds(miniWindowPlacement(left, workArea), workArea)).toStrictEqual(left);
});

test("stays in the bottom-right corner on a bigger screen", () => {
    const corner = { x: 1920 - 340, y: 1040 - 480, width: 340, height: 480 };
    expect(normalizeMiniWindowBounds(miniWindowPlacement(corner, fullHd), uhd)).toStrictEqual({
        x: 3840 - 340,
        y: 2120 - 480,
        width: 340,
        height: 480,
    });
});

test("keeps its spot on a screen at another origin", () => {
    const leftScreenCorner = { x: 1920 - 340, y: 1040 - 480, width: 340, height: 480 };
    const rightScreen = { x: 1920, y: 0, width: 1920, height: 1040 };
    expect(normalizeMiniWindowBounds(miniWindowPlacement(leftScreenCorner, fullHd), rightScreen)).toStrictEqual({
        x: 1920 + 1920 - 340,
        y: 1040 - 480,
        width: 340,
        height: 480,
    });
});

test("keeps a centred panel centred", () => {
    const centred = { x: (1920 - 340) / 2, y: (1040 - 480) / 2, width: 340, height: 480 };
    expect(normalizeMiniWindowBounds(miniWindowPlacement(centred, fullHd), uhd)).toStrictEqual({
        x: (3840 - 340) / 2,
        y: (2120 - 480) / 2,
        width: 340,
        height: 480,
    });
});

test("shrinks an oversized panel and keeps out-of-range ratios on-screen", () => {
    expect(
        normalizeMiniWindowBounds(
            { xRatio: -2, yRatio: 5, width: 900, height: 100 },
            { x: 0, y: 0, width: 800, height: 600 }
        )
    ).toStrictEqual({ x: 0, y: 240, width: 800, height: MINI_WINDOW_MIN_HEIGHT });
});

test("never returns a rectangle below the minimum size", () => {
    const bounds = normalizeMiniWindowBounds({ xRatio: 0, yRatio: 0, width: 50, height: 50 }, workArea);
    expect(bounds.width).toBe(MINI_WINDOW_MIN_WIDTH);
    expect(bounds.height).toBe(MINI_WINDOW_MIN_HEIGHT);
});
