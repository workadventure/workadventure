import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Writable } from "svelte/store";
import { get, writable } from "svelte/store";
import type { LocalStreamStoreValue } from "./LocalStreamTypes";

vi.mock("./MediaStore", () => ({
    rawLocalStreamStore: writable<LocalStreamStoreValue>({ type: "success", stream: undefined }),
    silentStore: writable(false),
    usedMicrophoneDeviceIdStore: writable<string | undefined>(undefined),
}));

vi.mock("./IsStreamingStore", () => ({
    isLiveStreamingAudioStore: writable(false),
}));

vi.mock("./MicrophoneValidatedForDeviceIdStore", () => ({
    microphoneValidatedForDeviceIdStore: writable<string | undefined>(undefined),
}));

vi.mock("./MyMediaStore", () => ({
    myMicrophoneStore: writable(false),
}));

vi.mock("../WebRtc/AudioContextManager", () => ({
    audioContextManager: {
        getContext: vi.fn(),
    },
}));

import {
    createMicrophoneSignalDetectorStore,
    hasMicrophoneSignal,
    microphoneSignalDetectionEligibleStore,
} from "./MicrophoneSignalDetectorStore";
import { isLiveStreamingAudioStore } from "./IsStreamingStore";
import { silentStore, usedMicrophoneDeviceIdStore } from "./MediaStore";
import { microphoneValidatedForDeviceIdStore } from "./MicrophoneValidatedForDeviceIdStore";
import { myMicrophoneStore } from "./MyMediaStore";

describe("MicrophoneSignalDetectorStore", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        myMicrophoneStore.set(false);
        (isLiveStreamingAudioStore as Writable<boolean>).set(false);
        (silentStore as unknown as Writable<boolean>).set(false);
        usedMicrophoneDeviceIdStore.set(undefined);
        microphoneValidatedForDeviceIdStore.set(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("detects a low-frequency signal from time-domain samples", () => {
        const sampleRate = 48_000;
        const frequency = 100;
        const samples = Float32Array.from(
            { length: 2048 },
            (_, index) => 0.01 * Math.sin((2 * Math.PI * frequency * index) / sampleRate),
        );

        expect(hasMicrophoneSignal(samples)).toBe(true);
        expect(hasMicrophoneSignal(new Float32Array(2048))).toBe(false);
    });

    it("is eligible only until the active microphone device is validated", () => {
        myMicrophoneStore.set(true);
        (isLiveStreamingAudioStore as Writable<boolean>).set(true);
        usedMicrophoneDeviceIdStore.set("microphone-1");

        expect(get(microphoneSignalDetectionEligibleStore)).toBe(true);

        microphoneValidatedForDeviceIdStore.set("microphone-1");
        expect(get(microphoneSignalDetectionEligibleStore)).toBe(false);

        usedMicrophoneDeviceIdStore.set("microphone-2");
        expect(get(microphoneSignalDetectionEligibleStore)).toBe(true);

        (silentStore as unknown as Writable<boolean>).set(true);
        expect(get(microphoneSignalDetectionEligibleStore)).toBe(false);
    });

    it("creates and polls the analyser only while detection is eligible", () => {
        const audioTrack = {} as MediaStreamTrack;
        const mediaStream = {
            getAudioTracks: () => [audioTrack],
        } as MediaStream;
        const streamStore = writable<LocalStreamStoreValue>({ type: "success", stream: mediaStream });
        const eligibilityStore = writable(false);
        const source = {
            connect: vi.fn(),
            disconnect: vi.fn(),
        };
        let signalValue = 0;
        const analyser = {
            fftSize: 0,
            connect: vi.fn(),
            disconnect: vi.fn(),
            getFloatTimeDomainData: vi.fn((samples: Float32Array) => {
                samples.fill(signalValue);
            }),
        };
        const createAnalyser = vi.fn(() => analyser);
        const createMediaStreamSource = vi.fn(() => source);
        const context = {
            createAnalyser,
            createMediaStreamSource,
        } as unknown as AudioContext;
        const detectedValues: Array<boolean | undefined> = [];
        const detectorStore = createMicrophoneSignalDetectorStore(streamStore, eligibilityStore, () => context);
        const unsubscribe = detectorStore.subscribe((sample) => detectedValues.push(sample?.detected));

        expect(createAnalyser).not.toHaveBeenCalled();
        expect(vi.getTimerCount()).toBe(0);

        eligibilityStore.set(true);
        expect(createAnalyser).toHaveBeenCalledOnce();
        expect(source.connect).toHaveBeenCalledWith(analyser);
        expect(vi.getTimerCount()).toBe(1);

        vi.advanceTimersByTime(300);
        expect(detectedValues.filter((value) => value === false)).toHaveLength(3);

        signalValue = 0.01;
        vi.advanceTimersByTime(300);
        expect(detectedValues.at(-1)).toBe(true);
        expect(detectedValues.filter((value) => value === true)).toHaveLength(3);

        eligibilityStore.set(false);
        expect(source.disconnect).toHaveBeenCalledOnce();
        expect(analyser.disconnect).toHaveBeenCalledOnce();
        expect(vi.getTimerCount()).toBe(0);
        expect(detectedValues.at(-1)).toBeUndefined();

        unsubscribe();
    });
});
