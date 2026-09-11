import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHeldIntervalTracker } from "../../../src/front/Administration/HeldIntervalTracker";

const HOLD_MS = 1500;

/** Counts how many intervals were opened, and how many of those were closed. */
function spyTracker() {
    const ends: Array<ReturnType<typeof vi.fn>> = [];
    const tracker = createHeldIntervalTracker(() => {
        const end = vi.fn();
        ends.push(end);
        return end;
    }, HOLD_MS);

    return {
        tracker,
        get opened() {
            return ends.length;
        },
        get closed() {
            return ends.filter((end) => end.mock.calls.length > 0).length;
        },
    };
}

describe("createHeldIntervalTracker", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("opens one interval while active and closes it once the hold expires", () => {
        const spy = spyTracker();

        spy.tracker.set(true);
        expect(spy.opened).toBe(1);

        spy.tracker.set(false);
        expect(spy.closed).toBe(0);

        vi.advanceTimersByTime(HOLD_MS - 1);
        expect(spy.closed).toBe(0);

        vi.advanceTimersByTime(1);
        expect(spy.closed).toBe(1);
    });

    it("rides over a gap shorter than the hold as ONE interval", () => {
        // This is the whole point. The volume analyser flips on syllables, so without
        // the hold a sentence lands as a dozen sub-second intervals — every one of
        // them then below the pusher's one-second floor and dropped, which reports
        // continuous talking as almost no speech at all.
        const spy = spyTracker();

        spy.tracker.set(true);
        for (let pause = 0; pause < 5; pause++) {
            spy.tracker.set(false);
            vi.advanceTimersByTime(HOLD_MS - 100);
            spy.tracker.set(true);
        }

        expect(spy.opened).toBe(1);
        expect(spy.closed).toBe(0);
    });

    it("opens a second interval only after the first one actually closed", () => {
        const spy = spyTracker();

        spy.tracker.set(true);
        spy.tracker.set(false);
        vi.advanceTimersByTime(HOLD_MS);
        expect(spy.closed).toBe(1);

        spy.tracker.set(true);
        expect(spy.opened).toBe(2);
    });

    it("stays on one interval however often the signal repeats itself", () => {
        const spy = spyTracker();

        spy.tracker.set(true);
        spy.tracker.set(true);
        spy.tracker.set(true);

        expect(spy.opened).toBe(1);
    });

    it("closes immediately on stop, without waiting out the hold", () => {
        // The microphone closing is not a pause between words: there is nothing left
        // to come back to, so the interval must not stay open for another hold.
        const spy = spyTracker();

        spy.tracker.set(true);
        spy.tracker.stop();

        expect(spy.closed).toBe(1);
    });

    it("leaves a pending hold behind on stop rather than closing twice", () => {
        const spy = spyTracker();

        spy.tracker.set(true);
        spy.tracker.set(false);
        spy.tracker.stop();
        vi.advanceTimersByTime(HOLD_MS * 2);

        expect(spy.closed).toBe(1);
    });

    it("does nothing when the signal goes inactive with no interval open", () => {
        const spy = spyTracker();

        spy.tracker.set(false);
        vi.advanceTimersByTime(HOLD_MS * 2);
        spy.tracker.stop();

        expect(spy.opened).toBe(0);
    });
});
