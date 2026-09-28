import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import {
    createNoiseSuppressionAudioWorklet,
    observeNoiseSuppressionAudioWorkletMessages,
    type NoiseSuppressionAudioWorkletHandle,
    type NoiseSuppressionAudioWorkletOutboundMessage,
} from "@workadventure/noise-suppression/audio-worklet";
import {
    createDeepFilterNetAudioWorklet,
    DEEPFILTERNET_SAMPLE_RATE,
} from "@workadventure/noise-suppression/deepfilternet";
import type { NoiseSuppressionEngine, NoiseSuppressionTuning } from "../../Connection/LocalUserStore";

export interface NoiseSuppressionStatusMessage {
    status: "initializing" | "ready" | "error";
    message?: string;
}

interface NoiseSuppressionTransformerOptions {
    engine: NoiseSuppressionEngine;
    tuning: NoiseSuppressionTuning;
    onStatusChange?: (message: NoiseSuppressionStatusMessage) => void;
}

interface NoiseSuppressionSupport {
    supported: boolean;
    message?: string;
}

/** What both engines' worklet handles have in common. */
interface WorkletHandle {
    node: AudioWorkletNode;
    ready: Promise<unknown>;
    dispose(): void;
}

const DTLN_SAMPLE_RATE = 16000;
export class NoiseSuppressionTransformer {
    public readonly engine: NoiseSuppressionEngine;
    public readonly tuning: NoiseSuppressionTuning;
    private readonly audioContext: AudioContext;
    private readonly onStatusChange?: (message: NoiseSuppressionStatusMessage) => void;
    private lastProcessorStatus: NoiseSuppressionStatusMessage["status"] | undefined;
    private sourceNode: MediaStreamAudioSourceNode | undefined;
    private workletHandle: WorkletHandle | undefined;
    private stopObservingWorkletMessages: (() => void) | undefined;
    private destinationNode: MediaStreamAudioDestinationNode | undefined;
    private outputTrack: MediaStreamTrack | undefined;
    private inputTrack: MediaStreamTrack | undefined;

    constructor(options: NoiseSuppressionTransformerOptions) {
        this.engine = options.engine;
        this.tuning = options.tuning;
        this.audioContext = new AudioContext({
            sampleRate: this.engine === "dtln" ? DTLN_SAMPLE_RATE : DEEPFILTERNET_SAMPLE_RATE,
        });
        this.onStatusChange = options.onStatusChange;
        // Safari and background tabs suspend the context: the output track stays "live" but carries silence.
        this.audioContext.addEventListener("statechange", this.resumeIfSuspended);
        document.addEventListener("visibilitychange", this.resumeIfSuspended);
    }

    public static getSupport(): NoiseSuppressionSupport {
        if (typeof AudioContext === "undefined") {
            return {
                supported: false,
                message: "AudioContext is not available in this browser.",
            };
        }

        if (typeof AudioWorkletNode === "undefined" || !("audioWorklet" in AudioContext.prototype)) {
            return {
                supported: false,
                message: "AudioWorklet is not available in this browser.",
            };
        }

        return { supported: true };
    }

    public async transform(inputTrack: MediaStreamTrack, signal?: AbortSignal): Promise<MediaStreamTrack> {
        this.throwIfAborted(signal);

        if (this.inputTrack === inputTrack && this.outputTrack) {
            return this.outputTrack;
        }

        this.stop();
        this.onStatusChange?.({
            status: this.lastProcessorStatus === "ready" ? "ready" : "initializing",
        });

        await this.audioContext.resume();
        this.throwIfAborted(signal);
        await this.ensureWorkletHandleCreated();
        this.throwIfAborted(signal);

        if (!this.workletHandle) {
            throw new Error("Noise suppression worklet node failed to initialize.");
        }
        // Loading the model blocks the audio thread (~0.3 s for DeepFilterNet3): wire the microphone only once it is
        // done, or the voice we send drops out right when noise suppression starts. A failure rejects here.
        await this.workletHandle.ready;
        this.throwIfAborted(signal);

        const inputStream = new MediaStream([inputTrack]);
        this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);
        this.destinationNode = this.audioContext.createMediaStreamDestination();

        this.sourceNode.connect(this.workletHandle.node);
        this.workletHandle.node.connect(this.destinationNode);

        const outputTrack = this.destinationNode.stream.getAudioTracks()[0];
        if (!outputTrack) {
            throw new Error("Noise suppression worklet did not produce an audio track.");
        }

        this.outputTrack = outputTrack;
        this.inputTrack = inputTrack;

        return outputTrack;
    }

    public stop(): void {
        const workletNode = this.workletHandle?.node;

        if (this.sourceNode && workletNode) {
            try {
                this.sourceNode.disconnect(workletNode);
            } catch {
                // Ignore disconnect errors when tearing down a stale graph.
            }
        } else if (this.sourceNode) {
            try {
                this.sourceNode.disconnect();
            } catch {
                // Ignore disconnect errors when tearing down a stale graph.
            }
        }

        if (workletNode && this.destinationNode) {
            try {
                workletNode.disconnect(this.destinationNode);
            } catch {
                // Ignore disconnect errors when tearing down a stale graph.
            }
        } else if (workletNode) {
            try {
                workletNode.disconnect();
            } catch {
                // Ignore disconnect errors when tearing down a stale graph.
            }
        }

        this.outputTrack?.stop();

        this.sourceNode = undefined;
        this.destinationNode = undefined;
        this.outputTrack = undefined;
        this.inputTrack = undefined;
    }

    private async ensureWorkletHandleCreated(): Promise<void> {
        if (this.workletHandle) {
            return;
        }

        const workletHandle =
            this.engine === "dtln" ? await this.createDtlnWorklet() : await this.createDeepFilterNetWorklet();
        this.workletHandle = workletHandle;
        // A crash after start-up (e.g. a wasm trap) only surfaces here.
        this.workletHandle.node.addEventListener("processorerror", this.handleProcessorError);

        workletHandle.ready
            .then(() => {
                if (this.workletHandle !== workletHandle) {
                    return;
                }

                this.lastProcessorStatus = "ready";
                this.onStatusChange?.({ status: "ready" });
            })
            .catch((error: unknown) => {
                if (this.workletHandle !== workletHandle) {
                    return;
                }

                this.lastProcessorStatus = "error";
                this.onStatusChange?.({
                    status: "error",
                    message: error instanceof Error ? error.message : "Custom noise suppression failed to initialize.",
                });
            });
    }

    private async createDtlnWorklet(): Promise<WorkletHandle> {
        const workletHandle: NoiseSuppressionAudioWorkletHandle = await createNoiseSuppressionAudioWorklet(
            this.audioContext,
            { bypassUntilReady: true },
        );
        this.stopObservingWorkletMessages = observeNoiseSuppressionAudioWorkletMessages(
            workletHandle,
            (message: NoiseSuppressionAudioWorkletOutboundMessage) => {
                this.handleWorkletMessage(message);
            },
        );
        return workletHandle;
    }

    private async createDeepFilterNetWorklet(): Promise<WorkletHandle> {
        // Package defaults: 25 dB of attenuation while speaking (a faint, steady background), 45 dB in pauses.
        return createDeepFilterNetAudioWorklet(this.audioContext, {
            bypassUntilReady: true,
            minSpeechFrames: this.tuning.keystrokeFilter ? 2 : undefined,
            postGain: this.tuning.postGain,
            // The machine cannot keep up (two 2 s windows over 70 % of real time): the audio would crackle, so hand
            // over to the browser's processing like any other failure.
            onOverload: (load) => {
                if (!this.workletHandle) {
                    return; // Destroyed meanwhile
                }
                this.lastProcessorStatus = "error";
                this.onStatusChange?.({
                    status: "error",
                    message: `Noise suppression is too heavy for this device (${Math.round(load * 100)} % of real time).`,
                });
            },
        });
    }

    private readonly handleProcessorError = (): void => {
        this.lastProcessorStatus = "error";
        this.onStatusChange?.({ status: "error", message: "The noise suppression AudioWorklet processor failed." });
    };

    private readonly resumeIfSuspended = (): void => {
        if (this.audioContext.state !== "suspended" || !this.outputTrack) {
            return;
        }
        this.audioContext.resume().catch((error: unknown) => {
            // Silence is worse than noise: give up so the controller falls back to the raw microphone.
            console.warn("Could not resume the noise suppression AudioContext", error);
            this.lastProcessorStatus = "error";
            this.onStatusChange?.({ status: "error", message: "Noise suppression was suspended by the browser." });
        });
    };

    public async closeAndDestroy(): Promise<void> {
        this.audioContext.removeEventListener("statechange", this.resumeIfSuspended);
        document.removeEventListener("visibilitychange", this.resumeIfSuspended);
        this.stop();
        this.stopObservingWorkletMessages?.();
        this.stopObservingWorkletMessages = undefined;
        if (this.workletHandle) {
            this.workletHandle.node.removeEventListener("processorerror", this.handleProcessorError);
            this.workletHandle.dispose();
            this.workletHandle = undefined;
        }
        if (this.audioContext.state !== "closed") {
            await this.audioContext.close();
        }
    }

    private throwIfAborted(signal?: AbortSignal): void {
        if (!signal?.aborted) {
            return;
        }

        throw signal.reason instanceof Error ? signal.reason : new AbortError("Noise suppression transform aborted");
    }

    private handleWorkletMessage(message: NoiseSuppressionAudioWorkletOutboundMessage): void {
        if (message.type === "error") {
            this.lastProcessorStatus = "error";
            this.onStatusChange?.({
                status: "error",
                message: message.message,
            });
            return;
        }

        if (message.type === "processing-started") {
            return;
        }

        if (message.type === "benchmark-complete") {
            return;
        }
    }
}
