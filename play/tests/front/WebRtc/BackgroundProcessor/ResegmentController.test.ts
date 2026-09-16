import { describe, expect, it } from "vitest";
import { ResegmentController } from "../../../../src/front/WebRtc/BackgroundProcessor/ResegmentController";

const CHECKPOINT = 15_000;

/** Feeds one sample per checkpoint so each call is exactly one controller decision. */
function checkpoint(controller: ResegmentController, segmentMs: number, index: number): number {
    return controller.tick(segmentMs, index * CHECKPOINT);
}

describe("ResegmentController", () => {
    it("starts at every 2nd frame and ignores samples between checkpoints", () => {
        const controller = new ResegmentController(0);
        expect(controller.getInterval()).toBe(2);
        expect(controller.tick(100, 1_000)).toBe(2);
        expect(controller.tick(100, 14_999)).toBe(2);
    });

    it("only moves after the same recommendation at two consecutive checkpoints", () => {
        const controller = new ResegmentController(0);
        expect(checkpoint(controller, 40, 1)).toBe(2);
        expect(checkpoint(controller, 40, 2)).toBe(3);
        // A single fast checkpoint is not enough to come back down...
        expect(checkpoint(controller, 2, 3)).toBe(3);
        // ...and a neutral one in between resets the streak.
        expect(checkpoint(controller, 10, 4)).toBe(3);
        expect(checkpoint(controller, 2, 5)).toBe(3);
        expect(checkpoint(controller, 2, 6)).toBe(2);
    });

    it("clamps to [1, 4]", () => {
        const controller = new ResegmentController(0);
        for (let i = 1; i <= 10; i++) {
            checkpoint(controller, 100, i);
        }
        expect(controller.getInterval()).toBe(4);
        for (let i = 11; i <= 30; i++) {
            checkpoint(controller, 1, i);
        }
        expect(controller.getInterval()).toBe(1);
    });

    it("averages the samples of a checkpoint window", () => {
        const controller = new ResegmentController(0);
        // Mean 20 ms: neutral, twice.
        controller.tick(35, 1_000);
        controller.tick(5, CHECKPOINT);
        controller.tick(35, CHECKPOINT + 1_000);
        expect(controller.tick(5, 2 * CHECKPOINT)).toBe(2);
    });
});
