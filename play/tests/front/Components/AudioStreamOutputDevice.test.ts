import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { writable } from "svelte/store";
import AudioStreamWithOutputDevice from "./AudioStreamWithOutputDevice.svelte";

const flush = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

describe("AudioStream output device", () => {
    const setSinkId = vi.fn<(sinkId: string) => Promise<void>>();

    beforeEach(() => {
        // jsdom has no setSinkId
        Object.defineProperty(HTMLMediaElement.prototype, "setSinkId", { value: setSinkId, configurable: true });
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        Reflect.deleteProperty(HTMLMediaElement.prototype, "setSinkId");
        setSinkId.mockReset();
        vi.restoreAllMocks();
    });

    // A device that setSinkId() rejected (NotFoundError for a stale stored id) stayed recorded as applied, so
    // requesting it again returned success without ever calling setSinkId().
    it("calls setSinkId() again for a device whose previous attempt failed", async () => {
        setSinkId
            .mockRejectedValueOnce(new DOMException("Requested device not found", "NotFoundError"))
            .mockResolvedValue(undefined);
        const outputDevice = writable<string | undefined>("headset");
        const component = mount(AudioStreamWithOutputDevice, {
            target: document.createElement("div"),
            props: { outputDevice },
        });
        flushSync();
        await vi.waitFor(() => expect(setSinkId).toHaveBeenCalledTimes(1));
        await flush();

        outputDevice.set(undefined);
        flushSync();
        outputDevice.set("headset");
        flushSync();

        expect(setSinkId).toHaveBeenCalledTimes(2);
        expect(setSinkId).toHaveBeenLastCalledWith("headset");

        await unmount(component);
    });
});
