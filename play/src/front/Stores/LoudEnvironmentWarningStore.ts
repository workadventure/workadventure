import { derived, readable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { audioContextManager } from "../WebRtc/AudioContextManager";
import {
    BACKGROUND_NOISE_SAMPLE_RATE,
    createBackgroundNoiseDetector,
} from "../WebRtc/NoiseSuppression/BackgroundNoiseDetector";
import {
    rawLocalAudioTrackStore,
    requestedMicrophoneDeviceIdStore,
    requestedMicrophoneState,
    silentStore,
} from "./MediaStore";
import { noiseSuppressionEnabledStore } from "./NoiseSuppressionStore";
import { LoudEnvironmentDetectionController } from "./LoudEnvironmentDetectionController";

const loudEnvironmentInputStore = derived(
    [
        rawLocalAudioTrackStore,
        requestedMicrophoneState,
        silentStore,
        noiseSuppressionEnabledStore,
        requestedMicrophoneDeviceIdStore,
    ],
    ([$rawTrack, $microphoneRequested, $silent, $noiseSuppressionEnabled, $requestedDeviceId]) => ({
        track: $rawTrack.type === "success" ? $rawTrack.track : undefined,
        microphoneRequested: $microphoneRequested,
        silent: $silent,
        noiseSuppressionEnabled: $noiseSuppressionEnabled,
        requestedDeviceId: $requestedDeviceId,
    }),
);

export const loudEnvironmentWarningStore = readable(false, (set) => {
    const controller = new LoudEnvironmentDetectionController(loudEnvironmentInputStore, set, {
        // Only URLs are bundled: the worklet and RNNoise (about 110 kB) load when detection starts.
        createDetector: createBackgroundNoiseDetector,
        getAudioContext: () => audioContextManager.getContext(BACKGROUND_NOISE_SAMPLE_RATE),
        reportError: (error) => Sentry.captureException(error),
    });
    return () => controller.destroy();
});
