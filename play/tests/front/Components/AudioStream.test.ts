import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushSync, mount, unmount } from "svelte";
import { writable } from "svelte/store";

const { fakeContext, source } = vi.hoisted(() => {
    const source = { connect: vi.fn(), disconnect: vi.fn() };
    const gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() };
    const fakeContext = {
        state: "running",
        destination: {},
        setSinkId: vi.fn(() => Promise.resolve()),
        createMediaStreamSource: vi.fn(() => source),
        createGain: vi.fn(() => gain),
    };
    return { fakeContext, source };
});

vi.mock("../../../src/front/WebRtc/AudioContextManager", () => ({
    audioContextManager: { getContext: () => fakeContext },
}));
vi.mock("../../../src/front/Stores/AudioPlaybackStore", () => ({ signalAudioPlaybackBlocked: vi.fn() }));
vi.mock("../../../src/front/Stores/UserActivationStore", () => ({
    userActivationManager: { waitForUserActivation: () => new Promise(() => {}) },
}));

import AudioStreamWithSpeakerStore from "./AudioStreamWithSpeakerStore.svelte";

class FakeMediaStream {}

const flush = () =>
    new Promise((resolve) => {
        setTimeout(resolve, 0);
    });

describe("AudioStream WebAudio fallback", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal("MediaStream", FakeMediaStream);
        // A page without user activation (e.g. a new element while in picture-in-picture) cannot start playback
        vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
            new DOMException("play() needs a user gesture", "NotAllowedError"),
        );
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    const mountAudioStream = (speaker = writable("bluetooth-earbuds")) => {
        const target = document.createElement("div");
        const component = mount(AudioStreamWithSpeakerStore, {
            target,
            props: {
                streamStore: writable(new FakeMediaStream() as MediaStream),
                speaker,
                isBlocked: writable(false),
                volume: writable(1),
            },
        });
        return { target, component, speaker };
    };

    it("plays on the selected speaker, and stops as soon as the <audio> element plays by itself", async () => {
        const { target, component } = mountAudioStream();

        await vi.waitFor(() => expect(fakeContext.createMediaStreamSource).toHaveBeenCalled());
        await flush();
        // play() is attempted twice on mount (pre-effect and onMount): a single fallback still starts
        expect(fakeContext.createMediaStreamSource).toHaveBeenCalledTimes(1);
        expect(fakeContext.setSinkId).toHaveBeenCalledWith("bluetooth-earbuds");
        expect(source.disconnect).not.toHaveBeenCalled();

        // The element starts later: the stream must not be played twice
        target.querySelector("audio")?.dispatchEvent(new Event("playing"));
        expect(source.disconnect).toHaveBeenCalled();

        await unmount(component);
    });

    it("follows a speaker change while the fallback plays", async () => {
        const { component, speaker } = mountAudioStream();
        await vi.waitFor(() => expect(fakeContext.createMediaStreamSource).toHaveBeenCalled());
        await flush();

        speaker.set("laptop-speakers");
        flushSync();

        expect(fakeContext.setSinkId).toHaveBeenLastCalledWith("laptop-speakers");

        await unmount(component);
    });
});
