import { describe, expect, it } from "vitest";
import type { WokaEmoteState } from "./WokaEmoteCatalog";
import { FEET_OFFSET, feetAnchoredOffset, wheelSliceAt, wheelSlicePosition } from "./WokaEmoteGeometry";

const RESTING: WokaEmoteState = { frame: 1, x: 0, y: 0, angle: 0, scaleX: 1, scaleY: 1 };

describe("feetAnchoredOffset", () => {
    it("leaves a resting Woka where it is", () => {
        expect(feetAnchoredOffset(RESTING)).toEqual({ x: 0, y: 0 });
    });

    it("pushes a squashed Woka down so its feet stay on the floor", () => {
        // Half the height is missing above the waist, so the sprite has to sink by that much.
        const offset = feetAnchoredOffset({ ...RESTING, scaleY: 0.8 });
        expect(offset.y).toBeCloseTo(FEET_OFFSET * 0.2);
        expect(offset.x).toBeCloseTo(0);
    });

    it("lifts a stretched Woka so it grows upwards", () => {
        expect(feetAnchoredOffset({ ...RESTING, scaleY: 1.2 }).y).toBeCloseTo(-FEET_OFFSET * 0.2);
    });

    it("swings a tilted Woka around its feet rather than its waist", () => {
        const offset = feetAnchoredOffset({ ...RESTING, angle: 90 });
        expect(offset.x).toBeCloseTo(FEET_OFFSET);
        expect(offset.y).toBeCloseTo(FEET_OFFSET);
    });

    it("keeps the offset the recipe asked for", () => {
        expect(feetAnchoredOffset({ ...RESTING, x: 3, y: -15 })).toEqual({ x: 3, y: -15 });
    });
});

describe("the wheel geometry", () => {
    const COUNT = 6;

    it("puts the first slice at the top and runs clockwise", () => {
        const top = wheelSlicePosition(0, COUNT, 100);
        expect(top.x).toBeCloseTo(0);
        expect(top.y).toBeCloseTo(-100); // y grows downwards on screen

        const bottom = wheelSlicePosition(COUNT / 2, COUNT, 100);
        expect(bottom.y).toBeCloseTo(100);
    });

    it("selects the slice the pointer points at", () => {
        for (let index = 0; index < COUNT; index++) {
            const position = wheelSlicePosition(index, COUNT, 100);
            expect(wheelSliceAt(position.x, position.y, COUNT, 40)).toBe(index);
        }
    });

    it("still resolves a slice between two of them rather than leaving a gap", () => {
        // Half a slice past the top: the boundary has to fall on one side, never on nothing.
        const between = wheelSlicePosition(0.5, COUNT, 100);
        expect(wheelSliceAt(between.x, between.y, COUNT, 40)).not.toBeNull();
    });

    it("selects nothing inside the dead zone", () => {
        expect(wheelSliceAt(0, 0, COUNT, 40)).toBeNull();
        expect(wheelSliceAt(30, 0, COUNT, 40)).toBeNull();
        expect(wheelSliceAt(41, 0, COUNT, 40)).not.toBeNull();
    });
});
