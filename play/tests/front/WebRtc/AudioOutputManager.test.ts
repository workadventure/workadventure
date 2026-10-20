import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applySinkId } from "../../../src/front/WebRtc/AudioOutputManager";

/** A media element whose setSinkId() calls are settled by the test. */
function fakeElement() {
    const calls: { deviceId: string; resolve: () => void; reject: (e: unknown) => void }[] = [];
    const el = {
        sinkId: "",
        setSinkId: (deviceId: string) =>
            new Promise<void>((resolve, reject) => {
                const settle = () => {
                    el.sinkId = deviceId;
                    resolve();
                };
                calls.push({ deviceId, resolve: settle, reject });
            }),
    };
    return { el: el as unknown as HTMLMediaElement, calls, requested: () => calls.map((call) => call.deviceId) };
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
        await request;
        expect(el.sinkId).toBe("");
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
});
