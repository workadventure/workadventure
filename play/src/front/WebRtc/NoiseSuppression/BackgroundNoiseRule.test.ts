import { describe, expect, it } from "vitest";
import { BackgroundNoiseRule } from "./BackgroundNoiseRule";

// Pushes the frames until the rule fires, and returns the index of that frame (or -1).
function firstDetection(rule: BackgroundNoiseRule, frames: [vad: number, rms: number][]): number {
    return frames.findIndex(([vad, rms]) => rule.push(vad, rms));
}

function repeat(count: number, vad: number, rms: number): [number, number][] {
    return Array.from({ length: count }, () => [vad, rms]);
}

// Three voiced frames, then one frame between words, 200 times.
function speech(backgroundRms: number): [number, number][] {
    return Array.from({ length: 200 }, (): [number, number][] => [
        ...repeat(3, 0.95, 0.2),
        [0.1, backgroundRms],
    ]).flat();
}

describe("BackgroundNoiseRule", () => {
    it("fires after 1.5 s of loud frames without voice", () => {
        expect(firstDetection(new BackgroundNoiseRule(), repeat(300, 0.05, 0.03))).toBe(149);
    });

    it("measures the noise between words, and ignores the words", () => {
        expect(firstDetection(new BackgroundNoiseRule(), speech(0.03))).toBe(4 * 150 - 1);
        expect(firstDetection(new BackgroundNoiseRule(), speech(0.002))).toBe(-1);
    });

    it("ignores a quiet room and short sounds in it", () => {
        expect(firstDetection(new BackgroundNoiseRule(), repeat(300, 0.05, 0.005))).toBe(-1);
        const doorSlam = [...repeat(20, 0.05, 0.3), ...repeat(280, 0.05, 0.005)];
        expect(firstDetection(new BackgroundNoiseRule(), doorSlam)).toBe(-1);
    });
});
