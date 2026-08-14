import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { get } from "svelte/store";
import { applySinkId, getBubbleSoundUrl } from "../../../src/front/WebRtc/AudioOutputManager";
import { speakerSelectedStore, usedSpeakerDeviceIdStore } from "../../../src/front/Stores/MediaStore";

/**
 * jsdom implements neither setSinkId nor play(), so each test builds the element behaviour it needs.
 * The mock is returned alongside the element: asserting on `el.setSinkId` directly would be an
 * unbound method reference.
 */
function createMediaElement(
    sinkId = "",
    setSinkId: Mock<(id: string) => Promise<void>> = vi.fn<(id: string) => Promise<void>>(() => Promise.resolve()),
): { el: HTMLMediaElement; setSinkId: Mock<(id: string) => Promise<void>> } {
    return { el: { sinkId, setSinkId } as unknown as HTMLMediaElement, setSinkId };
}

describe("getBubbleSoundUrl", () => {
    it("points at files that exist under public/", () => {
        // Regression guard: the previous test sound was "/resources/objects/webrtc-in.mp3",
        // which 404s because only the -ding and -wobble variants are shipped.
        expect(getBubbleSoundUrl("ding")).toBe("/resources/objects/webrtc-in-ding.mp3");
        expect(getBubbleSoundUrl("wobble")).toBe("/resources/objects/webrtc-in-wobble.mp3");
    });
});

describe("applySinkId", () => {
    it("routes the element to the requested device", async () => {
        const { el, setSinkId } = createMediaElement();

        await expect(applySinkId(el, "device-1")).resolves.toBe(true);
        expect(setSinkId).toHaveBeenCalledWith("device-1");
    });

    it("reports the device that was actually applied", async () => {
        usedSpeakerDeviceIdStore.set(undefined);
        const { el } = createMediaElement();

        await applySinkId(el, "device-1");

        expect(get(usedSpeakerDeviceIdStore)).toBe("device-1");
    });

    it("forgets the applied device as soon as another one is picked", () => {
        usedSpeakerDeviceIdStore.set("device-1");

        speakerSelectedStore.set("device-2");

        // Otherwise the settings panel would compare a stale value against the new selection and
        // claim a fallback that never happened.
        expect(get(usedSpeakerDeviceIdStore)).toBeUndefined();
    });

    it("reports the system default when it had to fall back", async () => {
        usedSpeakerDeviceIdStore.set(undefined);
        const failing = vi
            .fn<(id: string) => Promise<void>>()
            .mockRejectedValueOnce(new DOMException("device is gone", "AbortError"))
            .mockResolvedValueOnce(undefined);
        const { el } = createMediaElement("", failing);

        await applySinkId(el, "device-1");

        // The settings panel compares this to the selection to warn that the browser refused it.
        expect(get(usedSpeakerDeviceIdStore)).toBe("");
    });

    it("applies the empty string, which means 'system default'", async () => {
        const { el, setSinkId } = createMediaElement("device-1");

        await expect(applySinkId(el, "")).resolves.toBe(true);
        expect(setSinkId).toHaveBeenCalledWith("");
    });

    it("does nothing when no device is requested", async () => {
        const { el, setSinkId } = createMediaElement();

        await expect(applySinkId(el, undefined)).resolves.toBe(false);
        expect(setSinkId).not.toHaveBeenCalled();
    });

    it("skips the call when the sink is already the right one", async () => {
        const { el, setSinkId } = createMediaElement("device-1");

        await expect(applySinkId(el, "device-1")).resolves.toBe(true);
        expect(setSinkId).not.toHaveBeenCalled();
    });

    it("reports failure instead of throwing on a browser without setSinkId", async () => {
        const el = { sinkId: undefined } as unknown as HTMLMediaElement;

        await expect(applySinkId(el, "device-1")).resolves.toBe(false);
    });

    it("falls back to the system default when the device vanished", async () => {
        const failing = vi
            .fn<(id: string) => Promise<void>>()
            .mockRejectedValueOnce(new DOMException("device is gone", "AbortError"))
            .mockResolvedValueOnce(undefined);
        const { el, setSinkId } = createMediaElement("", failing);

        await expect(applySinkId(el, "device-1")).resolves.toBe(false);
        expect(setSinkId).toHaveBeenNthCalledWith(1, "device-1");
        expect(setSinkId).toHaveBeenNthCalledWith(2, "");
    });
});

describe("playTestSound", () => {
    let play: Mock<() => Promise<void>>;
    let pause: Mock<() => void>;
    let setSinkId: Mock<(this: HTMLMediaElement, id: string) => Promise<void>>;
    /** Records the order of side effects, to assert the sink is set *before* playback starts. */
    let calls: string[];
    /** Every URL assigned to the element, to detect a reload on every click. */
    let assignedSources: string[];
    let playTestSound: (deviceId: string | undefined) => Promise<void>;
    let bubbleSoundStore: { set: (value: "ding" | "wobble") => void };

    beforeEach(async () => {
        calls = [];
        assignedSources = [];

        play = vi.fn().mockImplementation(() => {
            calls.push("play");
            return Promise.resolve();
        });
        pause = vi.fn();
        setSinkId = vi.fn().mockImplementation(function (this: HTMLMediaElement, id: string) {
            calls.push(`setSinkId:${id}`);
            // Mirror the browser: reading back sinkId returns what was applied. The manager relies
            // on this to skip redundant calls.
            Object.defineProperty(this, "sinkId", { configurable: true, writable: true, value: id });
            return Promise.resolve();
        });

        vi.spyOn(window.HTMLMediaElement.prototype, "play").mockImplementation(play);
        vi.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(pause);
        // jsdom exposes neither of these, so define them rather than spy on them.
        Object.defineProperty(window.HTMLMediaElement.prototype, "setSinkId", {
            configurable: true,
            writable: true,
            value: setSinkId,
        });
        Object.defineProperty(window.HTMLMediaElement.prototype, "sinkId", {
            configurable: true,
            writable: true,
            value: "",
        });
        Object.defineProperty(window.HTMLMediaElement.prototype, "src", {
            configurable: true,
            get(this: HTMLMediaElement & { _src?: string }) {
                return this._src ?? "";
            },
            set(this: HTMLMediaElement & { _src?: string }, value: string) {
                this._src = value;
                assignedSources.push(value);
            },
        });

        // The manager keeps one element for the lifetime of the module, so reload it between tests
        // to get a fresh one instead of leaking sink state across cases.
        vi.resetModules();
        ({ playTestSound } = await import("../../../src/front/WebRtc/AudioOutputManager"));
        ({ bubbleSoundStore } = await import("../../../src/front/Stores/AudioManagerStore"));
    });

    it("sets the sink before starting playback", async () => {
        await playTestSound("device-1");

        // Chrome ignores a sink set on an already-playing element, hence the strict ordering.
        expect(calls).toEqual(["setSinkId:device-1", "play"]);
    });

    it("plays the bubble sound the user configured", async () => {
        bubbleSoundStore.set("wobble");

        await playTestSound("device-1");

        expect(assignedSources).toEqual(["/resources/objects/webrtc-in-wobble.mp3"]);
    });

    it("reuses a single element instead of reloading it on every click", async () => {
        await playTestSound("device-1");
        await playTestSound("device-1");
        await playTestSound("device-2");

        expect(play).toHaveBeenCalledTimes(3);
        // The source is assigned once, and the sink only re-applied when it actually changes.
        expect(assignedSources).toHaveLength(1);
        expect(setSinkId).toHaveBeenCalledTimes(2);
    });

    it("restarts the sound from the beginning on each click", async () => {
        await playTestSound("device-1");
        await playTestSound("device-1");

        expect(pause).toHaveBeenCalledTimes(2);
    });

    it("serializes overlapping clicks", async () => {
        await Promise.all([playTestSound("device-1"), playTestSound("device-2")]);

        // Never two setSinkId in flight at once: each run completes before the next starts.
        expect(calls).toEqual(["setSinkId:device-1", "play", "setSinkId:device-2", "play"]);
    });

    it("does not reject when playback is blocked", async () => {
        play.mockRejectedValueOnce(new DOMException("blocked", "NotAllowedError"));

        await expect(playTestSound("device-1")).resolves.toBeUndefined();
    });
});
