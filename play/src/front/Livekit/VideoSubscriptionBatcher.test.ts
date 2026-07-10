import { afterEach, describe, expect, it, vi } from "vitest";
import type { RemoteTrackPublication } from "livekit-client";
import { VideoSubscriptionBatcher } from "./VideoSubscriptionBatcher";

function pub(): RemoteTrackPublication & { setSubscribed: ReturnType<typeof vi.fn> } {
    return { setSubscribed: vi.fn() } as unknown as RemoteTrackPublication & {
        setSubscribed: ReturnType<typeof vi.fn>;
    };
}

describe("VideoSubscriptionBatcher", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("applies a requested subscription on the next flush, not synchronously", () => {
        vi.useFakeTimers();
        const batcher = new VideoSubscriptionBatcher(50);
        const p = pub();

        batcher.request(p, true);
        expect(p.setSubscribed).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);
        expect(p.setSubscribed).toHaveBeenCalledTimes(1);
        expect(p.setSubscribed).toHaveBeenCalledWith(true);
    });

    it("coalesces transient churn: subscribe then unsubscribe within the window never hits the network", () => {
        vi.useFakeTimers();
        const batcher = new VideoSubscriptionBatcher(50);
        const p = pub();

        batcher.request(p, true);
        batcher.request(p, false);
        vi.advanceTimersByTime(50);

        // Net state is "unsubscribed" and it was never subscribed → no call at all.
        expect(p.setSubscribed).not.toHaveBeenCalled();
    });

    it("applies only the net state of a burst", () => {
        vi.useFakeTimers();
        const batcher = new VideoSubscriptionBatcher(50);
        const p = pub();

        batcher.request(p, true);
        batcher.request(p, false);
        batcher.request(p, true);
        vi.advanceTimersByTime(50);

        expect(p.setSubscribed).toHaveBeenCalledTimes(1);
        expect(p.setSubscribed).toHaveBeenCalledWith(true);
    });

    it("skips a redundant request that matches the already-applied state", () => {
        vi.useFakeTimers();
        const batcher = new VideoSubscriptionBatcher(50);
        const p = pub();

        batcher.request(p, true);
        vi.advanceTimersByTime(50);
        expect(p.setSubscribed).toHaveBeenCalledTimes(1);

        batcher.request(p, true);
        vi.advanceTimersByTime(50);
        expect(p.setSubscribed).toHaveBeenCalledTimes(1);
    });

    it("flushes changes for several publications in a single pass", () => {
        vi.useFakeTimers();
        const batcher = new VideoSubscriptionBatcher(50);
        const a = pub();
        const b = pub();

        batcher.request(a, true);
        batcher.request(b, true);
        vi.advanceTimersByTime(50);

        expect(a.setSubscribed).toHaveBeenCalledWith(true);
        expect(b.setSubscribed).toHaveBeenCalledWith(true);
    });

    it("schedules a fresh window for changes made after a flush", () => {
        vi.useFakeTimers();
        const batcher = new VideoSubscriptionBatcher(50);
        const p = pub();

        batcher.request(p, true);
        vi.advanceTimersByTime(50);
        batcher.request(p, false);
        expect(p.setSubscribed).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(50);
        expect(p.setSubscribed).toHaveBeenCalledTimes(2);
        expect(p.setSubscribed).toHaveBeenLastCalledWith(false);
    });

    it("keeps applying the rest of the batch when one publication throws", () => {
        vi.useFakeTimers();
        vi.spyOn(console, "error").mockImplementation(() => {});
        const batcher = new VideoSubscriptionBatcher(50);
        const bad = pub();
        bad.setSubscribed.mockImplementation(() => {
            throw new Error("boom");
        });
        const good = pub();

        batcher.request(bad, true);
        batcher.request(good, true);
        vi.advanceTimersByTime(50);

        expect(good.setSubscribed).toHaveBeenCalledWith(true);
    });
});
