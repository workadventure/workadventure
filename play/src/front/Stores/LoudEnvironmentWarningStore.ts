import { derived, readable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import type * as BackgroundNoise from "@workadventure/noise-suppression/background-noise";
import type { Unsubscriber } from "svelte/store";
import { audioContextManager } from "../WebRtc/AudioContextManager";
import {
    rawLocalAudioTrackStore,
    requestedMicrophoneDeviceIdStore,
    requestedMicrophoneState,
    silentStore,
} from "./MediaStore";
import { noiseSuppressionEnabledStore } from "./NoiseSuppressionStore";
import { LoudEnvironmentDetectionController } from "./LoudEnvironmentDetectionController";

const BACKGROUND_NOISE_SAMPLE_RATE = 16_000;
const detectorObservers = new WeakMap<
    BackgroundNoise.BackgroundNoiseDetectorHandle,
    (listener: (message: BackgroundNoise.BackgroundNoiseDetectorOutboundMessage) => void) => Unsubscriber
>();

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
        createDetector: async (context, stream) => {
            const module = await import("@workadventure/noise-suppression/background-noise");
            const handle = await module.createBackgroundNoiseDetector(context, stream);
            detectorObservers.set(handle, (listener) =>
                module.observeBackgroundNoiseDetectorMessages(handle, listener),
            );
            return handle;
        },
        observeDetector: (handle, listener) => {
            const observe = detectorObservers.get(handle);
            if (observe === undefined) {
                throw new Error("Background noise detector observer was not initialized");
            }
            return observe(listener);
        },
        getAudioContext: () => audioContextManager.getContext(BACKGROUND_NOISE_SAMPLE_RATE),
        reportError: (error) => Sentry.captureException(error),
    });
    return () => controller.destroy();
});
