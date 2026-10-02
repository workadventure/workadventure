import { describe, expect, it } from "vitest";
import { FpsVariabilityTracker } from "../../../src/front/WebRtc/FpsVariabilityTracker";

function feed(tracker: FpsVariabilityTracker, fpsValues: number[], expectedFps: number | undefined, startAt = 0) {
    let result: number | undefined;
    fpsValues.forEach((fps, index) => {
        result = tracker.push(fps, expectedFps, 640, 360, startAt + index * 1000);
    });
    return result;
}

describe("FpsVariabilityTracker", () => {
    it("measures the raw frame rate when the sender never told us its target", () => {
        const tracker = new FpsVariabilityTracker();
        expect(feed(tracker, [20, 20, 20, 20, 20, 20, 20], undefined)).toBeUndefined();
        expect(feed(tracker, [20], undefined, 7000)).toBe(0);
        expect(feed(tracker, [10], undefined, 8000)).toBeGreaterThan(3);
    });

    it("does not count an intentional pause and resume as instability", () => {
        const tracker = new FpsVariabilityTracker();
        // Settle after the transition that follows the first announced target (2 s), then 8 steady samples
        feed(tracker, [20, 20], 20, 0);
        expect(feed(tracker, [20, 20, 20, 20, 20, 20, 20, 20], 20, 2000)).toBe(0);

        // Paused by the sender because we do not display it: nothing measured
        expect(feed(tracker, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0, 10_000)).toBeUndefined();

        // Resumed: the encoder ramps up during the transition, then the window restarts from scratch
        expect(feed(tracker, [5, 15], 20, 20_000)).toBeUndefined();
        expect(feed(tracker, [20, 20, 20, 20, 20, 20, 20], 20, 22_000)).toBeUndefined();
        expect(feed(tracker, [20], 20, 29_000)).toBe(0);
    });

    it("restarts the window when the target frame rate changes", () => {
        const tracker = new FpsVariabilityTracker();
        feed(tracker, [20, 20], 20, 0);
        expect(feed(tracker, [20, 20, 20, 20, 20, 20, 20, 20], 20, 2000)).toBe(0);
        // The viewer enlarged its tile: the sender now targets 30 fps
        expect(feed(tracker, [30, 30, 30, 30, 30, 30, 30, 30, 30, 30], 30, 10_000)).toBe(0);
    });

    it("restarts the window when the frame size changes", () => {
        const tracker = new FpsVariabilityTracker();
        feed(tracker, [20, 20, 20, 20, 20, 20, 20, 20], undefined);
        expect(tracker.push(20, undefined, 1280, 720, 8000)).toBeUndefined();
    });
});
