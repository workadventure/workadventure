import { get } from "svelte/store";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import {
    type NoiseSuppressionStatusMessage,
    NoiseSuppressionTransformer,
} from "../WebRtc/NoiseSuppression/NoiseSuppressionTransformer";
import { noiseSuppressionStateStore } from "./NoiseSuppressionStore";

export class NoiseSuppressionController {
    private transformer: NoiseSuppressionTransformer | undefined;

    public async transform(
        audioTrack: MediaStreamTrack | undefined,
        noiseSuppressionEnabled: boolean,
        signal?: AbortSignal,
    ): Promise<MediaStreamTrack | undefined> {
        this.throwIfAborted(signal);

        if (!noiseSuppressionEnabled) {
            this.stop();
            return audioTrack;
        }

        if (audioTrack === undefined) {
            this.stop();
            return undefined;
        }

        const currentNoiseSuppressionState = get(noiseSuppressionStateStore);
        if (currentNoiseSuppressionState.status === "error" || currentNoiseSuppressionState.status === "unsupported") {
            await this.destroy();
            return audioTrack;
        }

        const support = NoiseSuppressionTransformer.getSupport();
        if (!support.supported) {
            await this.destroy();
            noiseSuppressionStateStore.set({
                status: "unsupported",
                message: support.message ?? "This browser cannot run custom noise suppression.",
            });
            return audioTrack;
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
            return await this.transformer.transform(audioTrack, signal);
        } catch (error) {
            if (this.isAbortError(error)) {
                throw error;
            }
            await this.destroy();
            this.updateState({
                status: "error",
                message: error instanceof Error ? error.message : "Custom noise suppression failed to initialize.",
            });
            return audioTrack;
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
