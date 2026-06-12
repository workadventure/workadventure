import { derived, writable } from "svelte/store";

import type { NoiseSuppressionProvider } from "../Connection/LocalUserStore";
import { localUserStore } from "../Connection/LocalUserStore";
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

function createNoiseSuppressionEnabledStore() {
    const initialValue = localUserStore.getNoiseSuppressionEnabled();
    const { subscribe, set } = writable(initialValue);

    return {
        subscribe,
        setEnabled(value: boolean) {
            localUserStore.setNoiseSuppressionEnabled(value);
            set(value);
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

function createNoiseSuppressionProviderStore() {
    const initialValue = localUserStore.getNoiseSuppressionProvider();
    const { subscribe, set } = writable<NoiseSuppressionProvider>(initialValue);

    return {
        subscribe,
        setProvider(value: NoiseSuppressionProvider) {
            localUserStore.setNoiseSuppressionProvider(value);
            set(value);
            if (value === "workadventure" && localUserStore.getNoiseSuppressionEnabled()) {
                noiseSuppressionStateStore.set({ status: "pendingInitialization" });
            } else {
                noiseSuppressionStateStore.set({ status: "disabled" });
            }
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

export const noiseSuppressionStateStore = writable<NoiseSuppressionState>(
    localUserStore.getNoiseSuppressionEnabled() && localUserStore.getNoiseSuppressionProvider() === "workadventure"
        ? { status: "pendingInitialization" }
        : { status: "disabled" },
);

export const noiseSuppressionEnabledStore = createNoiseSuppressionEnabledStore();
export const noiseSuppressionProviderStore = createNoiseSuppressionProviderStore();

export const browserNoiseSuppressionSupportedStore = writable(
    typeof navigator !== "undefined" && navigator.mediaDevices?.getSupportedConstraints().noiseSuppression === true,
);

export const voiceIsolationSupportedStore = createVoiceIsolationSupportedStore();

export const effectiveNoiseSuppressionProviderStore = derived(
    [noiseSuppressionProviderStore, browserNoiseSuppressionSupportedStore, voiceIsolationSupportedStore],
    ([$noiseSuppressionProviderStore, $browserNoiseSuppressionSupportedStore, $voiceIsolationSupportedStore]) => {
        return getEffectiveNoiseSuppressionProvider({
            provider: $noiseSuppressionProviderStore,
            browserNoiseSuppressionSupported: $browserNoiseSuppressionSupportedStore,
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
