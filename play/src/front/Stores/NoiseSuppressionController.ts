import { get } from "svelte/store";
import NoiseSuppressionDisabledToast from "../Components/Toasts/NoiseSuppressionDisabledToast.svelte";
import {
    type NoiseSuppressionStatusMessage,
    NoiseSuppressionTransformer,
} from "../WebRtc/NoiseSuppression/NoiseSuppressionTransformer";
import type { LocalStreamStoreValue } from "./LocalStreamTypes";
import { noiseSuppressionEnabledStore, noiseSuppressionStateStore } from "./NoiseSuppressionStore";
import { toastStore } from "./ToastStore";

const NOISE_SUPPRESSION_DISABLED_TOAST_ID = "noise-suppression-disabled-toast";

export class NoiseSuppressionController {
    private transformer: NoiseSuppressionTransformer | undefined;

    public async transform(
        rawValue: LocalStreamStoreValue,
        noiseSuppressionEnabled: boolean
    ): Promise<LocalStreamStoreValue> {
        if (!noiseSuppressionEnabled) {
            await this.stop();
            return rawValue;
        }

        if (
            rawValue.type === "error" ||
            rawValue.stream === undefined ||
            rawValue.stream.getAudioTracks().length === 0
        ) {
            await this.stop();
            return rawValue;
        }

        const currentNoiseSuppressionState = get(noiseSuppressionStateStore);
        if (currentNoiseSuppressionState.status === "error" || currentNoiseSuppressionState.status === "unsupported") {
            await this.destroy();
            return rawValue;
        }

        const support = NoiseSuppressionTransformer.getSupport();
        if (!support.supported) {
            await this.destroy();
            noiseSuppressionStateStore.set({
                status: "unsupported",
                message: support.message ?? "This browser cannot run custom noise suppression.",
            });
            return rawValue;
        }

        if (currentNoiseSuppressionState.status !== "initializing" && currentNoiseSuppressionState.status !== "ready") {
            noiseSuppressionStateStore.set({ status: "initializing" });
        }

        if (!this.transformer) {
            this.transformer = new NoiseSuppressionTransformer({
                onStatusChange: this.updateState.bind(this),
            });
        }

        try {
            return {
                type: "success",
                stream: await this.transformer.transform(rawValue.stream),
            };
        } catch (error) {
            await this.destroy();
            this.updateState({
                status: "error",
                message: error instanceof Error ? error.message : "Custom noise suppression failed to initialize.",
            });
            return rawValue;
        }
    }

    public async stop(): Promise<void> {
        if (!this.transformer) {
            return;
        }

        await this.transformer.stop();
    }

    public async destroy(): Promise<void> {
        if (!this.transformer) {
            return;
        }

        const transformer = this.transformer;
        this.transformer = undefined;
        await transformer.closeAndDestroy();
    }

    private updateState(message: NoiseSuppressionStatusMessage): void {
        const currentState = get(noiseSuppressionStateStore);

        if (message.status === "starved") {
            this.autoDisableDueToStarvation(message.message);
            return;
        }

        if (message.status === "ready") {
            if (currentState.status !== "ready") {
                noiseSuppressionStateStore.set({ status: "ready" });
            }
            return;
        }

        if (message.status === "initializing") {
            if (currentState.status !== "initializing") {
                noiseSuppressionStateStore.set({ status: "initializing" });
            }
            return;
        }

        if (currentState.status !== "error" || currentState.message !== message.message) {
            noiseSuppressionStateStore.set({
                status: "error",
                message: message.message ?? "Custom noise suppression failed. Browser microphone processing is active.",
            });
        }
    }

    private autoDisableDueToStarvation(message?: string): void {
        const currentState = get(noiseSuppressionStateStore);
        if (currentState.status === "auto-disabled-starved" && currentState.message === message) {
            return;
        }

        this.destroy().catch((error) => {
            console.warn("[MediaStore] Failed to destroy the noise suppression transformer after starvation", error);
        });
        noiseSuppressionEnabledStore.autoDisableDueToStarvation(message);
        toastStore.addToast(NoiseSuppressionDisabledToast, {}, NOISE_SUPPRESSION_DISABLED_TOAST_ID);
    }
}
