import { get } from "svelte/store";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import {
    type NoiseSuppressionStatusMessage,
    NoiseSuppressionTransformer,
} from "../WebRtc/NoiseSuppression/NoiseSuppressionTransformer";
import type { LocalStreamStoreValue } from "./LocalStreamTypes";
import { noiseSuppressionStateStore } from "./NoiseSuppressionStore";

export class NoiseSuppressionController {
    private transformer: NoiseSuppressionTransformer | undefined;

    public async transform(
        rawValue: LocalStreamStoreValue,
        noiseSuppressionEnabled: boolean,
        signal?: AbortSignal,
    ): Promise<LocalStreamStoreValue> {
        this.throwIfAborted(signal);

        if (!noiseSuppressionEnabled) {
            this.stop();
            return rawValue;
        }

        if (
            rawValue.type === "error" ||
            rawValue.stream === undefined ||
            rawValue.stream.getAudioTracks().length === 0
        ) {
            this.stop();
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

        try {
            if (!this.transformer) {
                this.transformer = new NoiseSuppressionTransformer({
                    onStatusChange: this.updateState.bind(this),
                });
            }

            this.throwIfAborted(signal);
            return {
                type: "success",
                stream: await this.transformer.transform(rawValue.stream, signal),
            };
        } catch (error) {
            if (this.isAbortError(error)) {
                throw error;
            }
            await this.destroy();
            this.updateState({
                status: "error",
                message: error instanceof Error ? error.message : "Custom noise suppression failed to initialize.",
            });
            return rawValue;
        }
    }

    public stop(): void {
        if (!this.transformer) {
            return;
        }

        this.transformer.stop();
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

    private throwIfAborted(signal?: AbortSignal): void {
        if (!signal?.aborted) {
            return;
        }

        throw signal.reason instanceof Error ? signal.reason : new AbortError("Noise suppression transform aborted");
    }

    private isAbortError(error: unknown): boolean {
        return error instanceof AbortError || (error instanceof DOMException && error.name === "AbortError");
    }
}
