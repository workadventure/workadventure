import { describe, expect, it, vi } from "vitest";
import {
    TimedEventsByKey,
    type TimedAnalyticsEventHandle,
} from "../../../src/front/Administration/TimedAnalyticsEvent";

/** A handle that records whether it was closed, and how many times. */
function spyHandle(): TimedAnalyticsEventHandle & { closed: () => number } {
    const close = vi.fn();
    return { close, closed: () => close.mock.calls.length };
}

describe("TimedEventsByKey", () => {
    it("ends the interval a key was already measuring rather than overwriting it", () => {
        // The bug this exists to prevent: an overwritten handle has nothing left that
        // could close it, so the pusher only ends that interval when the socket dies —
        // which dates a walk through an area to the end of the session.
        const events = new TimedEventsByKey();
        const first = spyHandle();
        const second = spyHandle();

        events.replace("area-1", first);
        events.replace("area-1", second);

        expect(first.closed()).toBe(1);
        expect(second.closed()).toBe(0);
    });

    it("keeps keys independent, so closing one leaves the others measuring", () => {
        // Areas overlap on a map and cowebsites sit side by side; this is the whole
        // reason these two are keyed where a screen share or a broadcast is not.
        const events = new TimedEventsByKey();
        const one = spyHandle();
        const two = spyHandle();

        events.replace("area-1", one);
        events.replace("area-2", two);
        events.close("area-1");

        expect(one.closed()).toBe(1);
        expect(two.closed()).toBe(0);
    });

    it("closes a key once, however often it is asked", () => {
        const events = new TimedEventsByKey();
        const handle = spyHandle();

        events.replace("area-1", handle);
        events.close("area-1");
        events.close("area-1");

        expect(handle.closed()).toBe(1);
    });

    it("closes everything on teardown", () => {
        const events = new TimedEventsByKey();
        const one = spyHandle();
        const two = spyHandle();

        events.replace("area-1", one);
        events.replace("area-2", two);
        events.closeAll();

        expect(one.closed()).toBe(1);
        expect(two.closed()).toBe(1);
    });

    it("forgets without closing when the socket is what went away", () => {
        // The opposite of closeAll, and the distinction is the point: the pusher has
        // already ended these as socket_closed, so closing them here would send frames
        // over the next socket for intervals already recorded — dropped there as
        // unpaired, having travelled for nothing.
        const events = new TimedEventsByKey();
        const handle = spyHandle();

        events.replace("area-1", handle);
        events.forget();

        expect(handle.closed()).toBe(0);

        // And the key is genuinely gone: re-entering that area opens a fresh interval
        // rather than closing a spent handle from a dead socket.
        const next = spyHandle();
        events.replace("area-1", next);
        expect(handle.closed()).toBe(0);
        expect(next.closed()).toBe(0);
    });
});
