import { derived, writable } from "svelte/store";

import { localUserStore } from "../Connection/LocalUserStore";

export type NoiseSuppressionStatus = "disabled" | "initializing" | "ready" | "error" | "unsupported";

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
            } else {
                noiseSuppressionStateStore.set({ status: "initializing" });
            }
        },
    };
}

export const noiseSuppressionStateStore = writable<NoiseSuppressionState>(
    localUserStore.getNoiseSuppressionEnabled() ? { status: "initializing" } : { status: "disabled" }
);

export const noiseSuppressionEnabledStore = createNoiseSuppressionEnabledStore();

export const customNoiseSuppressionActiveStore = derived(
    [noiseSuppressionEnabledStore, noiseSuppressionStateStore],
    ([$noiseSuppressionEnabledStore, $noiseSuppressionStateStore]) => {
        return (
            $noiseSuppressionEnabledStore &&
            $noiseSuppressionStateStore.status !== "error" &&
            $noiseSuppressionStateStore.status !== "unsupported"
        );
    }
);
