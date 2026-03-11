import { derived, writable } from "svelte/store";

import { localUserStore } from "../Connection/LocalUserStore";

export type NoiseSuppressionStatus =
    | "disabled"
    | "initializing"
    | "ready"
    | "error"
    | "unsupported"
    | "auto-disabled-starved";

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
        autoDisableDueToStarvation(message?: string) {
            localUserStore.setNoiseSuppressionEnabled(false);
            set(false);
            noiseSuppressionStateStore.set({
                status: "auto-disabled-starved",
                message:
                    message ??
                    "Custom noise suppression was disabled automatically because it could not keep up in real time.",
            });
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
            $noiseSuppressionStateStore.status !== "unsupported" &&
            $noiseSuppressionStateStore.status !== "auto-disabled-starved"
        );
    }
);
