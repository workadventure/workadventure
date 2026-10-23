import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Readable } from "svelte/store";
import { applySinkId, playOnSelectedOutput, pendingSinkRequests } from "../../../src/front/WebRtc/AudioOutputManager";

// The real store ignores every selection where livekit-client says the browser cannot choose the output, jsdom included
const selectedSpeaker = vi.hoisted(() => ({ deviceId: undefined as string | undefined }));
vi.mock("../../../src/front/Stores/AudioOutputStore", () => ({
    speakerSelectedStore: {
        subscribe: (run: (deviceId: string | undefined) => void) => {
            run(selectedSpeaker.deviceId);
            return () => {};
        },
    } satisfies Readable<string | undefined>,
}));

/** A media element whose setSinkId() calls are settled by the test. */
function fakeElement() {
    const calls: { deviceId: string; resolve: () => void; reject: (e: unknown) => void }[] = [];
    const el = {
        sinkId: "",
        play: vi.fn(() => Promise.resolve()),
        setSinkId: (deviceId: string) =>
            new Promise<void>((resolve, reject) => {
                const settle = () => {
                    el.sinkId = deviceId;
                    resolve();
                };
                calls.push({ deviceId, resolve: settle, reject });
            }),
    };
    return {
        el: el as unknown as HTMLMediaElement,
        play: el.play,
        calls,
        requested: () => calls.map((call) => call.deviceId),
    };
}

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("applySinkId", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("applies requests in order, without falling back when a newer device was requested", async () => {
        const { el, calls, requested } = fakeElement();
        const requests = [applySinkId(el, "headset-a"), applySinkId(el, "headset-b")];
        await flush();
        expect(requested()).toEqual(["headset-a"]);

        calls[0].reject(new DOMException("gone", "AbortError"));
        await flush();
        expect(requested()).toEqual(["headset-a", "headset-b"]);

        calls[1].resolve();
        await Promise.all(requests);
        expect(el.sinkId).toBe("headset-b");
    });

    it("falls back to the default output when the selected device fails", async () => {
        const { el, calls, requested } = fakeElement();
        const request = applySinkId(el, "headset-a");
        await flush();

        calls[0].reject(new DOMException("gone", "AbortError"));
        await flush();
        expect(requested()).toEqual(["headset-a", ""]);
        calls[1].resolve();
        expect(await request).toBe("fell-back");
        expect(el.sinkId).toBe("");
    });

    it("joins a request for the device already being requested", async () => {
        const { el, calls, requested } = fakeElement();
        const first = applySinkId(el, "headset-a");
        const second = applySinkId(el, "headset-a");
        expect(second).toBe(first);
        await flush();
        expect(requested()).toEqual(["headset-a"]);

        calls[0].resolve();
        expect(await second).toBe("applied");
    });

    it("does not wait forever on a hung request, and re-applies the newer device if it settles late", async () => {
        const { el, calls, requested } = fakeElement();
        const requests = [applySinkId(el, "headset-a"), applySinkId(el, "headset-b")];
        await vi.advanceTimersByTimeAsync(2_000);
        expect(requested()).toEqual(["headset-a", "headset-b"]);
        calls[1].resolve();
        await flush();

        calls[0].resolve();
        await flush();
        expect(requested()).toEqual(["headset-a", "headset-b", "headset-b"]);
        calls[2].resolve();
        await Promise.all(requests);
        await flush();
        expect(el.sinkId).toBe("headset-b");
    });

    it("exposes the pending requests of an element until they settled", async () => {
        const { el, calls } = fakeElement();
        expect(pendingSinkRequests(el)).toBeUndefined();

        applySinkId(el, "headset-a").catch(() => {});
        const pending = pendingSinkRequests(el);
        const settled = vi.fn();
        pending?.then(settled).catch(() => {});
        await flush();
        expect(pending).toBeDefined();
        expect(settled).not.toHaveBeenCalled();

        calls[0].resolve();
        await flush();
        expect(settled).toHaveBeenCalledOnce();
        expect(pendingSinkRequests(el)).toBeUndefined();
    });
});

describe("playOnSelectedOutput", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        selectedSpeaker.deviceId = undefined;
        vi.useRealTimers();
    });

    it("plays only once the selected output is applied", async () => {
        selectedSpeaker.deviceId = "headset";
        const { el, play, calls, requested } = fakeElement();
        const playing = playOnSelectedOutput(el);
        await flush();
        expect(requested()).toEqual(["headset"]);
        expect(play).not.toHaveBeenCalled();

        calls[0].resolve();
        await playing;
        expect(play).toHaveBeenCalledOnce();
    });

    // WebKit only plays within the user gesture: nothing may be awaited before play() where no output is chosen
    it("plays synchronously when no output is selected", async () => {
        const { el, play, requested } = fakeElement();
        const playing = playOnSelectedOutput(el);
        expect(play).toHaveBeenCalledOnce();
        expect(requested()).toEqual([]);
        await playing;
    });
});
