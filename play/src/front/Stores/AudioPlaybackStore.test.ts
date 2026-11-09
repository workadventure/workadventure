import { get } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import { createAudioPlaybackStore, handleSuspendedAudioContext } from "./AudioPlaybackStore";

describe("AudioPlaybackStore", () => {
    it("registers multiple retries and restores the empty state after removal", () => {
        const store = createAudioPlaybackStore();
        const firstRetry = vi.fn();
        const secondRetry = vi.fn();

        const removeFirst = store.register(firstRetry);
        const removeSecond = store.register(secondRetry);

        expect(get(store)).toEqual(new Set([firstRetry, secondRetry]));
        removeFirst();
        removeFirst();
        expect(get(store)).toEqual(new Set([secondRetry]));
        removeSecond();
        expect(get(store)).toEqual(new Set());
    });

    it("invokes every retry synchronously before awaiting their results", async () => {
        const store = createAudioPlaybackStore();
        const calls: string[] = [];
        let resolveFirst!: () => void;
        store.register(() => {
            calls.push("first");
            return new Promise<void>((resolve) => {
                resolveFirst = resolve;
            });
        });
        store.register(() => {
            calls.push("second");
        });

        const retryPromise = store.retryAll();

        expect(calls).toEqual(["first", "second"]);
        resolveFirst();
        await retryPromise;
    });

    it("does not register the same retry more than once", async () => {
        const store = createAudioPlaybackStore();
        const retry = vi.fn();

        store.register(retry);
        store.register(retry);
        await store.retryAll();

        expect(get(store).size).toBe(1);
        expect(retry).toHaveBeenCalledOnce();
    });

    it("isolates synchronous and asynchronous failures", async () => {
        const store = createAudioPlaybackStore();
        const successfulRetry = vi.fn();
        store.register(() => {
            throw new Error("synchronous failure");
        });
        store.register(() => Promise.reject(new Error("asynchronous failure")));
        store.register(successfulRetry);

        await expect(store.retryAll()).rejects.toBeInstanceOf(AggregateError);
        expect(successfulRetry).toHaveBeenCalledOnce();
        expect(get(store).size).toBe(3);
    });
});

describe("handleSuspendedAudioContext", () => {
    it("flags the sound as blocked before any user activation", () => {
        const context = { resume: vi.fn(() => Promise.resolve()) };
        const flagBlocked = vi.fn();

        handleSuspendedAudioContext(context, false, flagBlocked);

        expect(flagBlocked).toHaveBeenCalledOnce();
        expect(context.resume).not.toHaveBeenCalled();
    });

    it("resumes, without flagging, a context the browser suspended after a user activation", async () => {
        const context = { resume: vi.fn(() => Promise.resolve()) };
        const flagBlocked = vi.fn();

        handleSuspendedAudioContext(context, true, flagBlocked);
        await Promise.resolve();
        await Promise.resolve();

        expect(context.resume).toHaveBeenCalledOnce();
        expect(flagBlocked).not.toHaveBeenCalled();
    });

    it("flags the sound as blocked when the context cannot be resumed", async () => {
        const context = { resume: vi.fn(() => Promise.reject(new Error("no audio device"))) };
        const flagBlocked = vi.fn();
        vi.spyOn(console, "warn").mockImplementation(() => {});

        handleSuspendedAudioContext(context, true, flagBlocked);
        await vi.waitFor(() => expect(flagBlocked).toHaveBeenCalledOnce());
    });
});
