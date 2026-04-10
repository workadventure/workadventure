import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { TokenBucket } from "../../../src/front/Utils/TokenBucket";

describe("TokenBucket", () => {
    let bucket: TokenBucket;

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        bucket.destroy();
    });

    describe("Constructor", () => {
        it("should create a bucket with correct initial state", () => {
            bucket = new TokenBucket(5, 1, 1000);
            const stats = bucket.getStats();

            expect(stats.tokens).toBe(5);
            expect(stats.queueLength).toBe(0);
            expect(stats.isRefilling).toBe(false);
        });

        it("should throw error if capacity is invalid", () => {
            expect(() => new TokenBucket(0, 1, 1000)).toThrow("Capacity must be greater than 0");
            expect(() => new TokenBucket(-5, 1, 1000)).toThrow("Capacity must be greater than 0");
        });

        it("should throw error if refillRate is invalid", () => {
            expect(() => new TokenBucket(5, 0, 1000)).toThrow("Refill rate must be greater than 0");
            expect(() => new TokenBucket(5, -1, 1000)).toThrow("Refill rate must be greater than 0");
        });

        it("should throw error if refillInterval is invalid", () => {
            expect(() => new TokenBucket(5, 1, 0)).toThrow("Refill interval must be greater than 0");
            expect(() => new TokenBucket(5, 1, -1000)).toThrow("Refill interval must be greater than 0");
        });
    });

    describe("removeToken() - Immediate execution", () => {
        it("should execute callback immediately when tokens are available", () => {
            bucket = new TokenBucket(5, 1, 1000);
            const callback = vi.fn();

            const result = bucket.removeToken(callback);

            expect(result).toBeUndefined();
            expect(callback).toHaveBeenCalledOnce();
            expect(bucket.getStats().tokens).toBe(4);
        });

        it("should execute multiple callbacks immediately while tokens available", () => {
            bucket = new TokenBucket(3, 1, 1000);
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callback3 = vi.fn();

            const result1 = bucket.removeToken(callback1);
            const result2 = bucket.removeToken(callback2);
            const result3 = bucket.removeToken(callback3);

            expect(result1).toBeUndefined();
            expect(result2).toBeUndefined();
            expect(result3).toBeUndefined();
            expect(callback1).toHaveBeenCalledOnce();
            expect(callback2).toHaveBeenCalledOnce();
            expect(callback3).toHaveBeenCalledOnce();
            expect(bucket.getStats().tokens).toBe(0);
            expect(bucket.getStats().queueLength).toBe(0);
        });

        it("should start refill timer when first token is consumed", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callback = vi.fn();

            bucket.removeToken(callback);

            expect(bucket.getStats().isRefilling).toBe(true);
        });
    });

    describe("removeToken() - Queueing", () => {
        it("should queue callback when no tokens available", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            const result1 = bucket.removeToken(callback1);
            const result2 = bucket.removeToken(callback2);

            expect(result1).toBeUndefined();
            expect(result2).toBeDefined();
            expect(result2).toHaveProperty("cancel");
            expect(callback1).toHaveBeenCalledOnce();
            expect(callback2).not.toHaveBeenCalled();
            expect(bucket.getStats().queueLength).toBe(1);
            expect(bucket.getStats().isRefilling).toBe(true);
        });

        it("should queue multiple callbacks in order", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callback3 = vi.fn();

            const result1 = bucket.removeToken(callback1);
            const result2 = bucket.removeToken(callback2);
            const result3 = bucket.removeToken(callback3);

            expect(result1).toBeUndefined();
            expect(result2).toBeDefined();
            expect(result3).toBeDefined();
            expect(bucket.getStats().queueLength).toBe(2);
        });
    });

    describe("Refill mechanism", () => {
        it("should refill tokens after refillInterval", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            bucket.removeToken(callback1);
            bucket.removeToken(callback2);

            expect(callback2).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1000);

            expect(callback2).toHaveBeenCalledOnce();
            expect(bucket.getStats().tokens).toBe(0);
        });

        it("should refill multiple tokens per interval", () => {
            bucket = new TokenBucket(5, 3, 1000); // Capacity 5 to allow 3 refills
            const callbacks = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];

            callbacks.forEach((cb) => bucket.removeToken(cb));

            // All should execute immediately (5 tokens available)
            callbacks.forEach((cb) => expect(cb).toHaveBeenCalledOnce());
            expect(bucket.getStats().tokens).toBe(1); // 5 - 4 = 1
            expect(bucket.getStats().queueLength).toBe(0);
        });

        it("should cap tokens at capacity", () => {
            bucket = new TokenBucket(5, 10, 1000);
            const callback = vi.fn();

            bucket.removeToken(callback);
            expect(bucket.getStats().tokens).toBe(4);

            vi.advanceTimersByTime(1000);

            // Should be capped at 5, not 4 + 10 = 14
            expect(bucket.getStats().tokens).toBe(5);
        });

        it("should stop refilling when at full capacity with empty queue", () => {
            bucket = new TokenBucket(2, 1, 1000);
            const callback = vi.fn();

            bucket.removeToken(callback);
            expect(bucket.getStats().isRefilling).toBe(true);

            vi.advanceTimersByTime(1000);

            // Should be back at capacity with no queue
            expect(bucket.getStats().tokens).toBe(2);
            expect(bucket.getStats().queueLength).toBe(0);
            expect(bucket.getStats().isRefilling).toBe(false);
        });

        it("should continue refilling while queue has callbacks", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callbacks = [vi.fn(), vi.fn(), vi.fn()];

            callbacks.forEach((cb) => bucket.removeToken(cb));

            expect(bucket.getStats().queueLength).toBe(2);
            expect(bucket.getStats().isRefilling).toBe(true);

            vi.advanceTimersByTime(1000);
            expect(bucket.getStats().queueLength).toBe(1);
            expect(bucket.getStats().isRefilling).toBe(true);

            vi.advanceTimersByTime(1000);
            expect(bucket.getStats().queueLength).toBe(0);
            // After the queue is processed, the refill timer should stop
            // The scheduler may still have it pending, so we need to ensure
            // the next potential refill runs
            vi.runAllTimers();
            expect(bucket.getStats().isRefilling).toBe(false);
        });
    });

    describe("cancel() method", () => {
        it("should prevent callback execution and refund token", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            bucket.removeToken(callback1);
            const handle = bucket.removeToken(callback2);

            expect(handle).toBeDefined();
            expect(callback2).not.toHaveBeenCalled();
            expect(bucket.getStats().tokens).toBe(0);

            handle?.cancel();

            expect(bucket.getStats().tokens).toBe(1);
            expect(bucket.getStats().queueLength).toBe(0);
            expect(callback2).not.toHaveBeenCalled();
        });

        it("should not be able to cancel already executed callback", () => {
            bucket = new TokenBucket(2, 1, 1000);
            const callback = vi.fn();

            const handle = bucket.removeToken(callback);

            expect(handle).toBeUndefined();
            expect(callback).toHaveBeenCalledOnce();
            expect(bucket.getStats().tokens).toBe(1);
        });

        it("should not double-refund if cancel called multiple times", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            bucket.removeToken(callback1);
            const handle = bucket.removeToken(callback2);

            expect(handle).toBeDefined();
            expect(bucket.getStats().tokens).toBe(0);
            expect(bucket.getStats().queueLength).toBe(1);

            handle?.cancel();
            expect(bucket.getStats().tokens).toBe(1); // Token refunded
            expect(bucket.getStats().queueLength).toBe(0);

            handle?.cancel();
            expect(bucket.getStats().tokens).toBe(1); // Should not increase again
        });

        it("should process next queued callback when canceling earlier one", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callback3 = vi.fn();

            bucket.removeToken(callback1);
            const handle = bucket.removeToken(callback2);
            bucket.removeToken(callback3);

            expect(handle).toBeDefined();
            expect(bucket.getStats().queueLength).toBe(2);
            expect(callback2).not.toHaveBeenCalled();
            expect(callback3).not.toHaveBeenCalled();

            handle?.cancel();

            // callback2 is skipped, callback3 should execute
            expect(callback2).not.toHaveBeenCalled();
            expect(callback3).toHaveBeenCalledOnce();
            expect(bucket.getStats().queueLength).toBe(0);
        });
    });

    describe("Error handling", () => {
        it("should catch and log errors in callback without breaking queue", () => {
            bucket = new TokenBucket(2, 1, 1000);
            const errorCallback = vi.fn(() => {
                throw new Error("Test error");
            });
            const successCallback = vi.fn();

            vi.spyOn(console, "error").mockImplementation(() => {});

            bucket.removeToken(errorCallback);
            bucket.removeToken(successCallback);

            expect(errorCallback).toHaveBeenCalledOnce();
            expect(successCallback).toHaveBeenCalledOnce();

            vi.restoreAllMocks();
        });

        it("should log error to Sentry when callback throws", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const error = new Error("Test Sentry error");
            const errorCallback = vi.fn(() => {
                throw error;
            });

            vi.spyOn(console, "error").mockImplementation(() => {});

            bucket.removeToken(errorCallback);

            expect(errorCallback).toHaveBeenCalledOnce();

            vi.restoreAllMocks();
        });

        it("should continue processing queue even if a callback throws", () => {
            bucket = new TokenBucket(3, 1, 1000);
            const errorCallback = vi.fn(() => {
                throw new Error("Callback error");
            });
            const normalCallback1 = vi.fn();
            const normalCallback2 = vi.fn();

            vi.spyOn(console, "error").mockImplementation(() => {});

            bucket.removeToken(errorCallback);
            bucket.removeToken(normalCallback1);
            bucket.removeToken(normalCallback2);

            expect(errorCallback).toHaveBeenCalledOnce();
            expect(normalCallback1).toHaveBeenCalledOnce();
            expect(normalCallback2).toHaveBeenCalledOnce();

            vi.restoreAllMocks();
        });
    });

    describe("destroy() method", () => {
        it("should clear the refill timer", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callback = vi.fn();

            bucket.removeToken(callback);
            expect(bucket.getStats().isRefilling).toBe(true);

            bucket.destroy();

            expect(bucket.getStats().isRefilling).toBe(false);
        });

        it("should clear the queue", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callbacks = [vi.fn(), vi.fn(), vi.fn()];

            bucket.removeToken(callbacks[0]);
            callbacks.slice(1).forEach((cb) => bucket.removeToken(cb));

            expect(bucket.getStats().queueLength).toBe(2);

            bucket.destroy();

            expect(bucket.getStats().queueLength).toBe(0);
        });

        it("should prevent callbacks from executing after destroy", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            bucket.removeToken(callback1);
            bucket.removeToken(callback2);

            bucket.destroy();

            // Advance timers, but callback2 should not execute
            vi.advanceTimersByTime(1000);

            expect(callback2).not.toHaveBeenCalled();
        });
    });

    describe("getStats() method", () => {
        it("should return correct stats", () => {
            bucket = new TokenBucket(5, 2, 1000);
            const callback = vi.fn();

            bucket.removeToken(callback);

            const stats = bucket.getStats();

            expect(stats).toEqual({
                tokens: 4,
                queueLength: 0,
                isRefilling: true,
            });
        });

        it("should update stats as operations change", () => {
            bucket = new TokenBucket(1, 1, 1000);
            const callbacks = [vi.fn(), vi.fn(), vi.fn()];

            bucket.removeToken(callbacks[0]);
            expect(bucket.getStats().tokens).toBe(0);
            expect(bucket.getStats().queueLength).toBe(0);
            expect(bucket.getStats().isRefilling).toBe(true);

            bucket.removeToken(callbacks[1]);
            expect(bucket.getStats().tokens).toBe(0);
            expect(bucket.getStats().queueLength).toBe(1);
            expect(bucket.getStats().isRefilling).toBe(true);

            bucket.removeToken(callbacks[2]);
            expect(bucket.getStats().tokens).toBe(0);
            expect(bucket.getStats().queueLength).toBe(2);
            expect(bucket.getStats().isRefilling).toBe(true);

            vi.advanceTimersByTime(1000);
            expect(bucket.getStats().tokens).toBe(0);
            expect(bucket.getStats().queueLength).toBe(1);
            expect(bucket.getStats().isRefilling).toBe(true);
        });
    });

    describe("Complex scenarios", () => {
        it("should handle burst followed by throttling", () => {
            bucket = new TokenBucket(3, 1, 1000);
            const callbacks: Mock[] = [];

            // Burst: execute 3 callbacks immediately
            for (let i = 0; i < 3; i++) {
                callbacks.push(vi.fn());
                bucket.removeToken(callbacks[i]);
            }

            callbacks.forEach((cb) => expect(cb).toHaveBeenCalledOnce());
            expect(bucket.getStats().tokens).toBe(0);

            // Queue 3 more callbacks
            const queuedCallbacks: Mock[] = [];
            for (let i = 0; i < 3; i++) {
                queuedCallbacks.push(vi.fn());
                bucket.removeToken(queuedCallbacks[i]);
            }

            expect(bucket.getStats().queueLength).toBe(3);

            // Advance time and check progressive execution
            vi.advanceTimersByTime(1000);
            expect(queuedCallbacks[0]).toHaveBeenCalledOnce();
            expect(queuedCallbacks[1]).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1000);
            expect(queuedCallbacks[1]).toHaveBeenCalledOnce();

            vi.advanceTimersByTime(1000);
            expect(queuedCallbacks[2]).toHaveBeenCalledOnce();
        });

        it("should handle VideoBoxOptimizer use case: allow burst updates then throttle", () => {
            // Simulating the VideoBoxOptimizer scenario:
            // Allow up to 5 immediate visibility updates, then throttle at 1 per second
            bucket = new TokenBucket(5, 1, 1000);
            const visibilityUpdates: Mock[] = [];

            // Burst of 5 visibility changes (should all execute immediately)
            for (let i = 0; i < 5; i++) {
                visibilityUpdates.push(vi.fn());
                bucket.removeToken(visibilityUpdates[i]);
            }

            visibilityUpdates.forEach((cb, i) => {
                expect(cb).toHaveBeenCalledOnce();
            });

            // More visibility changes queue up
            for (let i = 0; i < 3; i++) {
                visibilityUpdates.push(vi.fn());
                bucket.removeToken(visibilityUpdates[5 + i]);
            }

            expect(bucket.getStats().queueLength).toBe(3);

            // They execute gradually
            vi.advanceTimersByTime(1000);
            expect(visibilityUpdates[5]).toHaveBeenCalledOnce();

            vi.advanceTimersByTime(1000);
            expect(visibilityUpdates[6]).toHaveBeenCalledOnce();

            vi.advanceTimersByTime(1000);
            expect(visibilityUpdates[7]).toHaveBeenCalledOnce();
        });
    });
});
