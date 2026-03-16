import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import {
    createNoiseSuppressionAudioWorklet,
    observeNoiseSuppressionAudioWorkletMessages,
    type NoiseSuppressionAudioWorkletHandle,
    type NoiseSuppressionAudioWorkletOutboundMessage,
} from "@workadventure/noise-suppression/audio-worklet";
//import noiseSuppressionWorkletModuleUrl from "../../../../../libs/noise-suppression/dist/assets/audio-worklet-processor-BzD3X4oc.js?url";

export interface NoiseSuppressionStatusMessage {
    status: "initializing" | "ready" | "error" | "starved";
    message?: string;
}

interface NoiseSuppressionTransformerOptions {
    onStatusChange?: (message: NoiseSuppressionStatusMessage) => void;
}

interface NoiseSuppressionSupport {
    supported: boolean;
    message?: string;
}

const NOISE_SUPPRESSION_SAMPLE_RATE = 16000;
export class NoiseSuppressionTransformer {
    private readonly audioContext: AudioContext;
    private readonly onStatusChange?: (message: NoiseSuppressionStatusMessage) => void;
    private lastProcessorStatus: NoiseSuppressionStatusMessage["status"] | undefined;
    private sourceNode: MediaStreamAudioSourceNode | undefined;
    private workletHandle: NoiseSuppressionAudioWorkletHandle | undefined;
    private stopObservingWorkletMessages: (() => void) | undefined;
    private destinationNode: MediaStreamAudioDestinationNode | undefined;
    private outputStream: MediaStream | undefined;
    private inputStream: MediaStream | undefined;

    constructor(options?: NoiseSuppressionTransformerOptions) {
        this.audioContext = new AudioContext({ sampleRate: NOISE_SUPPRESSION_SAMPLE_RATE });
        this.onStatusChange = options?.onStatusChange;
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

    public async transform(inputStream: MediaStream, signal?: AbortSignal): Promise<MediaStream> {
        this.throwIfAborted(signal);

        if (this.inputStream === inputStream && this.outputStream) {
            return this.outputStream;
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

        this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);
        this.destinationNode = this.audioContext.createMediaStreamDestination();

        this.sourceNode.connect(this.workletHandle.node);
        this.workletHandle.node.connect(this.destinationNode);

        this.outputStream = new MediaStream([
            ...inputStream.getVideoTracks(),
            ...this.destinationNode.stream.getAudioTracks(),
        ]);
        this.inputStream = inputStream;

        return this.outputStream;
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

        this.outputStream?.getAudioTracks().forEach((track) => track.stop());

        this.sourceNode = undefined;
        this.destinationNode = undefined;
        this.outputStream = undefined;
        this.inputStream = undefined;
    }

    private async ensureWorkletHandleCreated(): Promise<void> {
        if (this.workletHandle) {
            return;
        }

        const workletHandle = await createNoiseSuppressionAudioWorklet(this.audioContext, {
            bypassUntilReady: true,
            //            moduleUrl: noiseSuppressionWorkletModuleUrl,
        });

        this.stopObservingWorkletMessages = observeNoiseSuppressionAudioWorkletMessages(
            workletHandle,
            (message: NoiseSuppressionAudioWorkletOutboundMessage) => {
                this.handleWorkletMessage(message);
            }
        );
        this.workletHandle = workletHandle;

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

    public async closeAndDestroy(): Promise<void> {
        this.stop();
        this.stopObservingWorkletMessages?.();
        this.stopObservingWorkletMessages = undefined;
        if (this.workletHandle) {
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

        // TODO: When the library exposes overrun/underrun notifications, map them to
        // WorkAdventure's existing "starved" status instead of dropping the path.
    }
}
