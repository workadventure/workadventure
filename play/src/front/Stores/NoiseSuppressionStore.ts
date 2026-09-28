import { derived, writable } from "svelte/store";

import type {
    NoiseSuppressionEngine,
    NoiseSuppressionProvider,
    NoiseSuppressionTuning,
} from "../Connection/LocalUserStore";
import { localUserStore } from "../Connection/LocalUserStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { getEffectiveNoiseSuppressionProvider } from "./MicrophoneSettings";

export type NoiseSuppressionStatus =
    | "disabled"
    | "pendingInitialization"
    | "initializing"
    | "ready"
    | "error"
    | "unsupported";

export interface NoiseSuppressionState {
    status: NoiseSuppressionStatus;
    message?: string;
}

function trackNoiseSuppressionSetting(): void {
    analyticsClient.trackAdminEvent("settings.noise_suppression.changed", {
        enabled: localUserStore.getNoiseSuppressionEnabled(),
        provider: localUserStore.getNoiseSuppressionProvider(),
        engine: localUserStore.getNoiseSuppressionEngine(),
    });
}

function createNoiseSuppressionEnabledStore() {
    const initialValue = localUserStore.getNoiseSuppressionEnabled();
    const { subscribe, set } = writable(initialValue);

    return {
        subscribe,
        setEnabled(value: boolean) {
            localUserStore.setNoiseSuppressionEnabled(value);
            set(value);
            trackNoiseSuppressionSetting();
            if (!value) {
                noiseSuppressionStateStore.set({ status: "disabled" });
            } else if (localUserStore.getNoiseSuppressionProvider() === "workadventure") {
                noiseSuppressionStateStore.set({ status: "pendingInitialization" });
            } else {
                noiseSuppressionStateStore.set({ status: "disabled" });
            }
        },
    };
}

function createMicrophoneAutoGainControlStore() {
    const initialValue = localUserStore.getMicrophoneAutoGainControl();
    const { subscribe, set } = writable(initialValue);

    return {
        subscribe,
        setEnabled(value: boolean) {
            localUserStore.setMicrophoneAutoGainControl(value);
            set(value);
        },
    };
}

function createMicrophoneEchoCancellationStore() {
    const initialValue = localUserStore.getMicrophoneEchoCancellation();
    const { subscribe, set } = writable(initialValue);

    return {
        subscribe,
        setEnabled(value: boolean) {
            localUserStore.setMicrophoneEchoCancellation(value);
            set(value);
        },
    };
}

function createMicrophoneBrowserNoiseSuppressionStore() {
    const initialValue = localUserStore.getMicrophoneBrowserNoiseSuppression();
    const { subscribe, set } = writable(initialValue);

    return {
        subscribe,
        setEnabled(value: boolean) {
            localUserStore.setMicrophoneBrowserNoiseSuppression(value);
            set(value);
        },
    };
}

function createNoiseSuppressionProviderStore() {
    const initialValue = localUserStore.getNoiseSuppressionProvider();
    const { subscribe, set } = writable<NoiseSuppressionProvider>(initialValue);

    return {
        subscribe,
        setProvider(value: NoiseSuppressionProvider) {
            localUserStore.setNoiseSuppressionProvider(value);
            set(value);
            trackNoiseSuppressionSetting();
            if (value === "workadventure" && localUserStore.getNoiseSuppressionEnabled()) {
                noiseSuppressionStateStore.set({ status: "pendingInitialization" });
            } else {
                noiseSuppressionStateStore.set({ status: "disabled" });
            }
        },
    };
}

function createNoiseSuppressionEngineStore() {
    const initialValue = localUserStore.getNoiseSuppressionEngine();
    const { subscribe, set } = writable<NoiseSuppressionEngine>(initialValue);

    return {
        subscribe,
        setEngine(value: NoiseSuppressionEngine) {
            localUserStore.setNoiseSuppressionEngine(value);
            set(value);
            trackNoiseSuppressionSetting();
            // A new engine gets a fresh chance, even if the previous one failed.
            if (
                localUserStore.getNoiseSuppressionEnabled() &&
                localUserStore.getNoiseSuppressionProvider() === "workadventure"
            ) {
                noiseSuppressionStateStore.set({ status: "pendingInitialization" });
            }
        },
    };
}

function createNoiseSuppressionTuningStore() {
    const { subscribe, set } = writable<NoiseSuppressionTuning>(localUserStore.getNoiseSuppressionTuning());

    return {
        subscribe,
        setTuning(value: NoiseSuppressionTuning) {
            localUserStore.setNoiseSuppressionTuning(value);
            set(value);
        },
    };
}

function createVoiceIsolationSupportedStore() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        setSupported(value: boolean) {
            set(value);
        },
    };
}

export const microphoneAutoGainControlStore = createMicrophoneAutoGainControlStore();
export const microphoneEchoCancellationStore = createMicrophoneEchoCancellationStore();
export const microphoneBrowserNoiseSuppressionStore = createMicrophoneBrowserNoiseSuppressionStore();

export const noiseSuppressionStateStore = writable<NoiseSuppressionState>(
    localUserStore.getNoiseSuppressionEnabled() && localUserStore.getNoiseSuppressionProvider() === "workadventure"
        ? { status: "pendingInitialization" }
        : { status: "disabled" },
);

export const noiseSuppressionEnabledStore = createNoiseSuppressionEnabledStore();
export const noiseSuppressionProviderStore = createNoiseSuppressionProviderStore();
export const noiseSuppressionEngineStore = createNoiseSuppressionEngineStore();
export const noiseSuppressionTuningStore = createNoiseSuppressionTuningStore();

export const browserNoiseSuppressionSupportedStore = writable(
    typeof navigator !== "undefined" && navigator.mediaDevices?.getSupportedConstraints().noiseSuppression === true,
);

export const voiceIsolationSupportedStore = createVoiceIsolationSupportedStore();

export const effectiveNoiseSuppressionProviderStore = derived(
    [noiseSuppressionProviderStore, voiceIsolationSupportedStore],
    ([$noiseSuppressionProviderStore, $voiceIsolationSupportedStore]) => {
        return getEffectiveNoiseSuppressionProvider({
            provider: $noiseSuppressionProviderStore,
            voiceIsolationSupported: $voiceIsolationSupportedStore,
        });
    },
);

export const customNoiseSuppressionActiveStore = derived(
    [noiseSuppressionEnabledStore, effectiveNoiseSuppressionProviderStore, noiseSuppressionStateStore],
    ([$noiseSuppressionEnabledStore, $effectiveNoiseSuppressionProviderStore, $noiseSuppressionStateStore]) => {
        return (
            $noiseSuppressionEnabledStore &&
            $effectiveNoiseSuppressionProviderStore === "workadventure" &&
            $noiseSuppressionStateStore.status !== "error" &&
            $noiseSuppressionStateStore.status !== "unsupported"
        );
    },
);
