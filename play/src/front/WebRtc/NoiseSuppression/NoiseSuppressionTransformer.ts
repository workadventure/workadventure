import noiseSuppressionAudioWorkletProcessorUrl from "./NoiseSuppressionAudioWorkletProcessor.ts?worker&url";

export interface NoiseSuppressionStatusMessage {
    status: "initializing" | "ready" | "error" | "starved";
    message?: string;
}

interface NoiseSuppressionControlMessage {
    type: "dispose";
}

interface NoiseSuppressionTransformerOptions {
    onStatusChange?: (message: NoiseSuppressionStatusMessage) => void;
}

interface NoiseSuppressionSupport {
    supported: boolean;
    message?: string;
}

const WORKLET_PROCESSOR_NAME = "noise-suppression-worklet-processor";
const NOISE_SUPPRESSION_SAMPLE_RATE = 16000;
const DTLN_SOURCE_URL = "/static/dtln/dtln.js";
export class NoiseSuppressionTransformer {
    private readonly audioContext: AudioContext;
    private readonly onStatusChange?: (message: NoiseSuppressionStatusMessage) => void;
    private isWorkletModuleLoaded = false;
    private lastProcessorStatus: NoiseSuppressionStatusMessage["status"] | undefined;
    private dtlnSourcePromise: Promise<string> | undefined;
    private sourceNode: MediaStreamAudioSourceNode | undefined;
    private workletNode: AudioWorkletNode | undefined;
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

    public async transform(inputStream: MediaStream): Promise<MediaStream> {
        if (this.inputStream === inputStream && this.outputStream) {
            return this.outputStream;
        }

        this.stop();
        this.onStatusChange?.({
            status: this.lastProcessorStatus === "ready" ? "ready" : "initializing",
        });

        await this.audioContext.resume();
        await this.ensureWorkletModuleLoaded();

        if (!this.workletNode) {
            throw new Error("Noise suppression worklet node failed to initialize.");
        }

        this.sourceNode = this.audioContext.createMediaStreamSource(inputStream);
        this.destinationNode = this.audioContext.createMediaStreamDestination();

        this.sourceNode.connect(this.workletNode);
        this.workletNode.connect(this.destinationNode);

        this.outputStream = new MediaStream([
            ...inputStream.getVideoTracks(),
            ...this.destinationNode.stream.getAudioTracks(),
        ]);
        this.inputStream = inputStream;

        return this.outputStream;
    }

    public stop(): void {
        if (this.sourceNode && this.workletNode) {
            try {
                this.sourceNode.disconnect(this.workletNode);
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

        if (this.workletNode && this.destinationNode) {
            try {
                this.workletNode.disconnect(this.destinationNode);
            } catch {
                // Ignore disconnect errors when tearing down a stale graph.
            }
        } else if (this.workletNode) {
            try {
                this.workletNode.disconnect();
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

    private async ensureWorkletModuleLoaded(): Promise<void> {
        if (this.isWorkletModuleLoaded) {
            return;
        }

        const dtlnSource = await this.loadDtlnSource();
        await this.audioContext.audioWorklet.addModule(noiseSuppressionAudioWorkletProcessorUrl);
        this.workletNode = new AudioWorkletNode(this.audioContext, WORKLET_PROCESSOR_NAME, {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            channelCount: 1,
            channelCountMode: "explicit",
            outputChannelCount: [1],
            processorOptions: {
                dtlnSource,
            },
        });
        this.workletNode.port.onmessage = (event: MessageEvent<NoiseSuppressionStatusMessage>) => {
            const data = event.data;
            if (!data || typeof data !== "object") {
                return;
            }

            if (
                data.status === "initializing" ||
                data.status === "ready" ||
                data.status === "error" ||
                data.status === "starved"
            ) {
                this.lastProcessorStatus = data.status;
                this.onStatusChange?.(data);
            }
        };
        this.isWorkletModuleLoaded = true;
    }

    private loadDtlnSource(): Promise<string> {
        if (!this.dtlnSourcePromise) {
            this.dtlnSourcePromise = fetch(DTLN_SOURCE_URL).then(async (response) => {
                if (!response.ok) {
                    throw new Error(`Failed to download the DTLN runtime (${response.status} ${response.statusText}).`);
                }

                return response.text();
            });
        }

        return this.dtlnSourcePromise;
    }

    public async closeAndDestroy(): Promise<void> {
        this.stop();
        if (this.workletNode) {
            this.workletNode.port.postMessage({ type: "dispose" } satisfies NoiseSuppressionControlMessage);
            this.workletNode.port.onmessage = null;
            this.workletNode.port.close();
            this.workletNode = undefined;
        }
        if (this.audioContext.state !== "closed") {
            await this.audioContext.close();
        }
    }
}
