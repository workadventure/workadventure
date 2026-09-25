import { describe, expect, it } from "vitest";
import { idleVideoBoxPriority, VIDEO_STARTING_PRIORITY } from "../VideoBoxPriorities";

// Lower priority means displayed first.
describe("idleVideoBoxPriority", () => {
    const now = 1_000_000_000;

    it("ranks every idle user after the active speakers", () => {
        expect(idleVideoBoxPriority(true, now, now)).toBeGreaterThan(VIDEO_STARTING_PRIORITY + 1000);
    });

    it("ranks a user who just spoke before a silent camera", () => {
        expect(idleVideoBoxPriority(false, now - 10_000, now)).toBeLessThan(idleVideoBoxPriority(true, undefined, now));
    });

    it("ranks a silent camera before a user who spoke long ago", () => {
        expect(idleVideoBoxPriority(true, undefined, now)).toBeLessThan(
            idleVideoBoxPriority(false, now - 120_000, now),
        );
    });

    it("ranks a camera that spoke before a camera that did not", () => {
        expect(idleVideoBoxPriority(true, now - 600_000, now)).toBeLessThan(idleVideoBoxPriority(true, undefined, now));
    });
});
