import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readable, writable } from "svelte/store";
import { createDelayedUnsubscribeStore } from "../../../../src/front/Stores/Utils/createDelayedUnsubscribeStore";

describe("createDelayedUnsubscribeStore", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it("should throw an error if delayForUnsubscribe is negative", () => {
        const store = writable(0);
        expect(() => createDelayedUnsubscribeStore(store, -100)).toThrow(
            "delayForUnsubscribe must be a non-negative number"
        );
    });

    it("should immediately subscribe to the underlying store on first subscription", () => {
        let subscribed = false;
        const store = readable(42, () => {
            subscribed = true;
            return () => {
                subscribed = false;
            };
        });

        const delayedStore = createDelayedUnsubscribeStore(store, 1000);
        expect(subscribed).toBe(false);
        const unsubscribe = delayedStore.subscribe(() => {});
        expect(subscribed).toBe(true);
        unsubscribe();
    });

    it("should pass through values from the underlying store", () => {
        const store = writable(10);
        const delayedStore = createDelayedUnsubscribeStore(store, 1000);
        const values: number[] = [];
        const unsubscribe = delayedStore.subscribe((value) => {
            values.push(value);
        });
        store.set(20);
        store.set(30);
        expect(values).toEqual([10, 20, 30]);
        unsubscribe();
    });

    it("should delay unsubscription from the underlying store", () => {
        let subscribed = false;
        const store = readable(42, () => {
            subscribed = true;
            return () => {
                subscribed = false;
            };
        });
        const delayedStore = createDelayedUnsubscribeStore(store, 2000);
        const unsubscribe = delayedStore.subscribe(() => {});
        expect(subscribed).toBe(true);
        unsubscribe();
        expect(subscribed).toBe(true);
        vi.advanceTimersByTime(1000);
        expect(subscribed).toBe(true);
        vi.advanceTimersByTime(1000);
        expect(subscribed).toBe(false);
    });

    it("should cancel delayed unsubscription if a new subscription occurs", () => {
        let subscribeCount = 0;
        let unsubscribeCount = 0;
        const store = readable(42, () => {
            subscribeCount++;
            return () => {
                unsubscribeCount++;
            };
        });
        const delayedStore = createDelayedUnsubscribeStore(store, 1000);
        const unsubscribe1 = delayedStore.subscribe(() => {});
        expect(subscribeCount).toBe(1);
        expect(unsubscribeCount).toBe(0);
        unsubscribe1();
        expect(unsubscribeCount).toBe(0);
        vi.advanceTimersByTime(500);
        const unsubscribe2 = delayedStore.subscribe(() => {});
        expect(subscribeCount).toBe(1);
        expect(unsubscribeCount).toBe(0);
        vi.advanceTimersByTime(1000);
        expect(subscribeCount).toBe(1);
        expect(unsubscribeCount).toBe(0);
        unsubscribe2();
        vi.advanceTimersByTime(1000);
        expect(unsubscribeCount).toBe(1);
    });

    it("should handle multiple simultaneous subscribers", () => {
        let subscribeCount = 0;
        let unsubscribeCount = 0;
        const store = readable(100, () => {
            subscribeCount++;
            return () => {
                unsubscribeCount++;
            };
        });
        const delayedStore = createDelayedUnsubscribeStore(store, 1000);
        const unsubscribe1 = delayedStore.subscribe(() => {});
        const unsubscribe2 = delayedStore.subscribe(() => {});
        const unsubscribe3 = delayedStore.subscribe(() => {});
        expect(subscribeCount).toBe(1);
        unsubscribe1();
        unsubscribe2();
        vi.advanceTimersByTime(2000);
        expect(unsubscribeCount).toBe(0);
        unsubscribe3();
        vi.advanceTimersByTime(1000);
        expect(unsubscribeCount).toBe(1);
    });

    it("should deliver the current value to new subscribers immediately", () => {
        const store = writable(5);
        const delayedStore = createDelayedUnsubscribeStore(store, 1000);
        const values1: number[] = [];
        const unsubscribe1 = delayedStore.subscribe((value) => {
            values1.push(value);
        });
        expect(values1).toEqual([5]);
        store.set(10);
        expect(values1).toEqual([5, 10]);
        unsubscribe1();
        vi.advanceTimersByTime(500);
        store.set(15);
        const values2: number[] = [];
        const unsubscribe2 = delayedStore.subscribe((value) => {
            values2.push(value);
        });
        expect(values2).toEqual([15]);
        unsubscribe2();
    });

    it("should work with zero delay", () => {
        let subscribed = false;
        const store = readable(42, () => {
            subscribed = true;
            return () => {
                subscribed = false;
            };
        });
        const delayedStore = createDelayedUnsubscribeStore(store, 0);
        const unsubscribe = delayedStore.subscribe(() => {});
        expect(subscribed).toBe(true);
        unsubscribe();
        expect(subscribed).toBe(true);
        vi.advanceTimersByTime(0);
        expect(subscribed).toBe(false);
    });

    it("should handle rapid subscribe/unsubscribe cycles", () => {
        let subscribeCount = 0;
        let unsubscribeCount = 0;
        const store = readable("test", () => {
            subscribeCount++;
            return () => {
                unsubscribeCount++;
            };
        });
        const delayedStore = createDelayedUnsubscribeStore(store, 1000);
        for (let i = 0; i < 10; i++) {
            const unsub = delayedStore.subscribe(() => {});
            unsub();
            vi.advanceTimersByTime(100);
        }
        expect(subscribeCount).toBe(1);
        expect(unsubscribeCount).toBe(0);
        vi.advanceTimersByTime(1000);
        expect(unsubscribeCount).toBe(1);
    });

    it("should properly clean up when multiple subscribers unsubscribe at different times", () => {
        const store = writable(0);
        const delayedStore = createDelayedUnsubscribeStore(store, 1000);
        const values1: number[] = [];
        const values2: number[] = [];
        const unsubscribe1 = delayedStore.subscribe((v) => values1.push(v));
        const unsubscribe2 = delayedStore.subscribe((v) => values2.push(v));
        store.set(1);
        expect(values1).toEqual([0, 1]);
        expect(values2).toEqual([0, 1]);
        unsubscribe1();
        store.set(2);
        expect(values1).toEqual([0, 1]);
        expect(values2).toEqual([0, 1, 2]);
        unsubscribe2();
        vi.advanceTimersByTime(1000);
        const values3: number[] = [];
        const unsubscribe3 = delayedStore.subscribe((v) => values3.push(v));
        expect(values3).toEqual([2]);
        unsubscribe3();
    });
});
