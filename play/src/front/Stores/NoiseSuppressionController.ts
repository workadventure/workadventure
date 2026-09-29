import { get } from "svelte/store";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import type { NoiseSuppressionEngine, NoiseSuppressionTuning } from "../Connection/LocalUserStore";
import { analyticsClient } from "../Administration/AnalyticsClient";
import {
    type NoiseSuppressionStatusMessage,
    NoiseSuppressionTransformer,
} from "../WebRtc/NoiseSuppression/NoiseSuppressionTransformer";
import { noiseSuppressionStateStore } from "./NoiseSuppressionStore";

export class NoiseSuppressionController {
    private transformer: NoiseSuppressionTransformer | undefined;
    private engine: NoiseSuppressionEngine = "deepfilternet";
    /** When the current initialization began; cleared once it is reported, so each start is counted once. */
    private initStartedAt: number | undefined;

    public async transform(
        audioTrack: MediaStreamTrack | undefined,
        noiseSuppressionEnabled: boolean,
        engine: NoiseSuppressionEngine,
        tuning: NoiseSuppressionTuning,
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

        // Each engine owns its AudioContext (16 kHz for DTLN, 48 kHz for DeepFilterNet3): switching rebuilds it.
        if (this.transformer && (this.transformer.engine !== engine || !sameTuning(this.transformer.tuning, tuning))) {
            await this.destroy();
        }

        this.engine = engine;
        const currentNoiseSuppressionState = get(noiseSuppressionStateStore);
        if (currentNoiseSuppressionState.status === "error" || currentNoiseSuppressionState.status === "unsupported") {
            await this.destroy();
            return audioTrack;
        }

        const support = NoiseSuppressionTransformer.getSupport();
        if (!support.supported) {
            await this.destroy();
            const message = support.message ?? "This browser cannot run custom noise suppression.";
            noiseSuppressionStateStore.set({ status: "unsupported", message });
            this.trackFailure("unsupported", message);
            return audioTrack;
        }

        if (currentNoiseSuppressionState.status !== "initializing" && currentNoiseSuppressionState.status !== "ready") {
            noiseSuppressionStateStore.set({ status: "initializing" });
            this.initStartedAt = performance.now();
        }

        try {
            if (!this.transformer) {
                this.transformer = new NoiseSuppressionTransformer({
                    engine,
                    tuning,
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
            if (this.initStartedAt !== undefined) {
                analyticsClient.trackAdminEvent("media.noise_suppression.started", {
                    engine: this.engine,
                    initMs: Math.round(performance.now() - this.initStartedAt),
                    hardwareConcurrency: navigator.hardwareConcurrency ?? 0,
                });
                this.initStartedAt = undefined;
            }
            return;
        }

        if (message.status === "initializing") {
            if (currentState.status !== "initializing") {
                noiseSuppressionStateStore.set({ status: "initializing" });
            }
            return;
        }

        const errorMessage =
            message.message ?? "Custom noise suppression failed. Browser microphone processing is active.";
        if (currentState.status !== "error") {
            noiseSuppressionStateStore.set({ status: "error", message: errorMessage });
            // One failure often arrives twice (processorerror, then the rejected ready): count the transition only
            this.trackFailure("error", errorMessage);
        } else if (currentState.message !== errorMessage) {
            noiseSuppressionStateStore.set({ status: "error", message: errorMessage });
        }
    }

    private trackFailure(status: "error" | "unsupported", reason: string): void {
        this.initStartedAt = undefined;
        analyticsClient.trackAdminEvent("media.noise_suppression.failed", {
            engine: this.engine,
            status,
            reason: reason.slice(0, 200),
        });
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

function sameTuning(a: NoiseSuppressionTuning, b: NoiseSuppressionTuning): boolean {
    return (
        a.keystrokeFilter === b.keystrokeFilter &&
        a.postGain === b.postGain &&
        a.shortGateLookahead === b.shortGateLookahead &&
        a.gateOff === b.gateOff
    );
}
