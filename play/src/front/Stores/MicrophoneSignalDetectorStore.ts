import type { Readable } from "svelte/store";
import { derived } from "svelte/store";
import { audioContextManager } from "../WebRtc/AudioContextManager";
import { isLiveStreamingAudioStore } from "./IsStreamingStore";
import { rawLocalStreamStore, silentStore, usedMicrophoneDeviceIdStore } from "./MediaStore";
import { microphoneValidatedForDeviceIdStore } from "./MicrophoneValidatedForDeviceIdStore";
import { myMicrophoneStore } from "./MyMediaStore";
import type { LocalStreamStoreValue } from "./LocalStreamTypes";

const SIGNAL_POLL_INTERVAL_MS = 100;
const MIN_SIGNAL_RMS = 0.001;

export interface MicrophoneSignalSample {
    detected: boolean;
}

export function hasMicrophoneSignal(samples: Float32Array, minimumRms = MIN_SIGNAL_RMS): boolean {
    if (samples.length === 0) {
        return false;
    }

    let sumOfSquares = 0;
    for (const sample of samples) {
        sumOfSquares += sample * sample;
    }

    return Math.sqrt(sumOfSquares / samples.length) > minimumRms;
}

export const microphoneSignalDetectionEligibleStore = derived(
    [
        myMicrophoneStore,
        isLiveStreamingAudioStore,
        silentStore,
        usedMicrophoneDeviceIdStore,
        microphoneValidatedForDeviceIdStore,
    ],
    ([myMicrophone, isLiveStreamingAudio, silent, usedDeviceId, validatedDeviceId]) =>
        myMicrophone &&
        isLiveStreamingAudio &&
        !silent &&
        usedDeviceId !== undefined &&
        usedDeviceId !== validatedDeviceId,
);

export function createMicrophoneSignalDetectorStore(
    streamStore: Readable<LocalStreamStoreValue>,
    eligibilityStore: Readable<boolean>,
    getAudioContext: () => AudioContext = () => audioContextManager.getContext(),
): Readable<MicrophoneSignalSample | undefined> {
    return derived<[Readable<LocalStreamStoreValue>, Readable<boolean>], MicrophoneSignalSample | undefined>(
        [streamStore, eligibilityStore],
        ([$streamStore, eligible], set) => {
            set(undefined);

            if (!eligible || $streamStore.type !== "success" || $streamStore.stream === undefined) {
                return;
            }

            const audioTracks = $streamStore.stream.getAudioTracks();
            if (audioTracks.length === 0) {
                return;
            }

            const context = getAudioContext();
            const analyser = context.createAnalyser();
            analyser.fftSize = 2048;
            const samples = new Float32Array(analyser.fftSize);
            const source = context.createMediaStreamSource($streamStore.stream);
            source.connect(analyser);

            const interval = setInterval(() => {
                analyser.getFloatTimeDomainData(samples);
                // Emit a new object for every poll. Svelte suppresses repeated primitive values,
                // but warning and validation counters need every consecutive sample.
                set({ detected: hasMicrophoneSignal(samples) });
            }, SIGNAL_POLL_INTERVAL_MS);

            return () => {
                clearInterval(interval);
                source.disconnect();
                analyser.disconnect();
            };
        },
        undefined,
    );
}

export const microphoneSignalDetectedStore = createMicrophoneSignalDetectorStore(
    rawLocalStreamStore,
    microphoneSignalDetectionEligibleStore,
);
