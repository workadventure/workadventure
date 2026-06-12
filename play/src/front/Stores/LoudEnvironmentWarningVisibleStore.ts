import { derived } from "svelte/store";
import { isLiveStreamingAudioStore } from "./IsStreamingStore";
import {
    localMicrophoneRmsStore,
    requestedMicrophoneState,
    silentStore,
    usedMicrophoneDeviceIdStore,
} from "./MediaStore";
import { myMicrophoneStore } from "./MyMediaStore";
import { noiseSuppressionEnabledStore, noiseSuppressionStateStore } from "./NoiseSuppressionStore";
import { LoudEnvironmentDetector } from "./LoudEnvironmentDetection";

const loudEnvironmentDetector = new LoudEnvironmentDetector();
let lastContextKey: string | undefined;

export const loudEnvironmentWarningVisibleStore = derived(
    [
        localMicrophoneRmsStore,
        myMicrophoneStore,
        isLiveStreamingAudioStore,
        silentStore,
        requestedMicrophoneState,
        usedMicrophoneDeviceIdStore,
        noiseSuppressionEnabledStore,
        noiseSuppressionStateStore,
    ],
    (
        [
            rms,
            myMic,
            isLiveStreamingAudio,
            silent,
            requestedMicrophone,
            usedDeviceId,
            noiseSuppressionEnabled,
            noiseSuppressionState,
        ],
        set,
    ) => {
        const isNoiseSuppressionStarting =
            noiseSuppressionEnabled &&
            (noiseSuppressionState.status === "pendingInitialization" ||
                noiseSuppressionState.status === "initializing");
        const shouldDetect =
            myMic && isLiveStreamingAudio && !silent && requestedMicrophone && !isNoiseSuppressionStarting;
        const suppressionContext = noiseSuppressionEnabled
            ? `suppression-${noiseSuppressionState.status}`
            : "suppression-off";
        const contextKey = `${usedDeviceId ?? "default"}:${suppressionContext}`;

        if (contextKey !== lastContextKey) {
            loudEnvironmentDetector.reset(contextKey);
            lastContextKey = contextKey;
            set(false);
        }

        if (!shouldDetect) {
            loudEnvironmentDetector.reset(contextKey);
            set(false);
            return;
        }

        if (
            loudEnvironmentDetector.processSample({
                rms,
                timestamp: Date.now(),
                enabled: true,
                contextKey,
            })
        ) {
            set(true);
        }
    },
    false,
);
