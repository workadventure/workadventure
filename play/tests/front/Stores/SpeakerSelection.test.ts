import { flushSync, mount, unmount } from "svelte";
import { get, writable } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/front/WebRtc/AudioContextManager", () => ({ audioContextManager: { getContext: vi.fn() } }));
vi.mock("../../../src/front/Stores/AudioPlaybackStore", () => ({ signalAudioPlaybackBlocked: vi.fn() }));
vi.mock("../../../src/front/Stores/UserActivationStore", () => ({
    userActivationManager: { waitForUserActivation: () => new Promise(() => {}) },
}));

import AudioStream from "../../../src/front/Components/Video/PictureInPicture/AudioStream.svelte";

const SAFARI =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15";
const CHROME =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

async function loadAudioOutputStoreIn(userAgent: string) {
    Object.defineProperty(navigator, "userAgent", { value: userAgent, configurable: true });
    vi.resetModules();
    return import("../../../src/front/Stores/AudioOutputStore");
}

function device(deviceId: string, kind: MediaDeviceKind, label: string): MediaDeviceInfo {
    return { deviceId, kind, label, groupId: label } as MediaDeviceInfo;
}

const airpodsMicrophone = device("airpods-in", "audioinput", "AirPods");
const airpodsOutput = device("airpods-out", "audiooutput", "AirPods");
const display = device("hdmi", "audiooutput", "Display");

// Each test reloads livekit-client under a new user agent, which can take a few seconds on a busy machine
describe("speaker selection", { timeout: 20_000 }, () => {
    const setSinkId = vi.fn(() => Promise.resolve());

    beforeEach(() => {
        // Safari has setSinkId since 18.4, so only the user agent tells it apart
        Object.defineProperty(HTMLMediaElement.prototype, "setSinkId", { value: setSinkId, configurable: true });
        // A choice stored before the selector was hidden on Safari
        localStorage.setItem("speakerDeviceId", "airpods");
    });

    afterEach(() => {
        Reflect.deleteProperty(HTMLMediaElement.prototype, "setSinkId");
        Reflect.deleteProperty(navigator, "userAgent");
        localStorage.clear();
        setSinkId.mockClear();
    });

    it("never makes a voice call setSinkId on Safari, which rejects it outside a user gesture", async () => {
        const { speakerSelectedStore } = await loadAudioOutputStoreIn(SAFARI);
        // Like the "new device detected" bubble or the device list restoring the stored choice
        speakerSelectedStore.set("airpods");

        const voice = mount(AudioStream, {
            target: document.createElement("div"),
            props: {
                streamStore: writable(undefined),
                outputDeviceId: get(speakerSelectedStore),
                isBlocked: writable(false),
                volume: writable(1),
            },
        });
        flushSync();

        expect(setSinkId).not.toHaveBeenCalled();
        expect(get(speakerSelectedStore)).toBeUndefined();
        await unmount(voice);
    });

    it("offers no output in the new device bubble on Safari, only the microphone of AirPods", async () => {
        const { devicesToOffer } = await loadAudioOutputStoreIn(SAFARI);

        expect(devicesToOffer([airpodsMicrophone, airpodsOutput, display])).toEqual([airpodsMicrophone]);
    });

    it("keeps the stored choice and offers outputs in browsers that let us pick the output", async () => {
        const { speakerSelectedStore, devicesToOffer } = await loadAudioOutputStoreIn(CHROME);

        expect(get(speakerSelectedStore)).toBe("airpods");
        expect(devicesToOffer([airpodsMicrophone, airpodsOutput, display])).toEqual([
            airpodsMicrophone,
            airpodsOutput,
            display,
        ]);
    });
});
