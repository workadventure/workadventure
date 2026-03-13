interface DtlnModule {
    postRun?: Array<() => void>;
    dtln_create: () => number;
    dtln_denoise: (handle: number, input: Float32Array, output: Float32Array) => boolean;
    dtln_destroy?: (handle: number) => void;
}

interface NoiseSuppressionWorkletMessage {
    status: "initializing" | "ready" | "error" | "starved";
    message?: string;
}

interface NoiseSuppressionControlMessage {
    type: "dispose";
}

interface NoiseSuppressionProcessorOptions {
    processorOptions?: {
        dtlnSource?: string;
    };
}

const DTLN_FIXED_BUFFER_SIZE = 512;
const MAX_CONSECUTIVE_STARVED_FRAMES = 10;

class NoiseSuppressionAudioWorkletProcessor extends AudioWorkletProcessor {
    private activePort: MessagePort | undefined;
    private dtlnModuleReady = false;
    private dtlnModuleErrorMessage: string | undefined;
    private dtlnModule: DtlnModule | undefined;
    private dtlnModuleLoadingAttempted = false;
    private dtlnModuleLoadingPromise: Promise<void> | undefined;
    private dtlnHandle: number | undefined;
    private readonly inputBuffer = new Float32Array(DTLN_FIXED_BUFFER_SIZE);
    private readonly processingOutputBuffer = new Float32Array(DTLN_FIXED_BUFFER_SIZE);
    private readonly outputChunks: Float32Array[] = [];
    private inputIndex = 0;
    private outputChunkOffset = 0;
    private consecutiveStarvedFrames = 0;
    private instanceErrorMessage: string | undefined;
    private disposed = false;
    private starved = false;

    constructor(options?: NoiseSuppressionProcessorOptions) {
        super();

        this.activePort = this.port;
        // Note: Due to restrictions in Firefox, we have to pass the DTLN module source code as a string through the options when registering the processor, instead of loading it directly in the worklet.
        // We tried with "?raw"
        const dtlnSource = options?.processorOptions?.dtlnSource;

        this.loadDtlnModule(dtlnSource).catch((error) => {
            this.dtlnModuleErrorMessage = error instanceof Error ? error.message : "Failed to load the DTLN runtime.";
            this.activePort?.postMessage({
                status: "error",
                message: this.dtlnModuleErrorMessage,
            } satisfies NoiseSuppressionWorkletMessage);
        });
        this.port.onmessage = (event: MessageEvent<NoiseSuppressionControlMessage>) => {
            if (event.data?.type === "dispose") {
                this.dispose();
            }
        };

        if (this.dtlnModuleErrorMessage) {
            this.port.postMessage({
                status: "error",
                message: this.dtlnModuleErrorMessage,
            } satisfies NoiseSuppressionWorkletMessage);
        } else if (this.dtlnModuleReady) {
            this.port.postMessage({ status: "ready" } satisfies NoiseSuppressionWorkletMessage);
        } else {
            this.port.postMessage({ status: "initializing" } satisfies NoiseSuppressionWorkletMessage);
        }
    }

    process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
        const output = outputs[0]?.[0];
        if (!output) {
            return true;
        }

        const input = this.getMonoInput(inputs);
        if (!input) {
            output.fill(0);
            return true;
        }

        if (this.disposed) {
            output.set(input);
            return false;
        }

        if (!this.dtlnModule || this.dtlnModuleErrorMessage || this.instanceErrorMessage) {
            output.set(input);
            return true;
        }

        if (!this.dtlnModuleReady) {
            output.set(input);
            return true;
        }

        if (this.starved) {
            output.set(input);
            return true;
        }

        try {
            if (this.dtlnHandle === undefined) {
                this.dtlnHandle = this.dtlnModule.dtln_create();
            }

            const dtlnHandle = this.dtlnHandle;
            if (dtlnHandle === undefined || !this.processInput(input, this.dtlnModule, dtlnHandle)) {
                output.set(input);
                return true;
            }

            this.writeOutput(output, input);
        } catch (error) {
            console.error("An error occurred while doing noise suppression", error);
            this.instanceErrorMessage = error instanceof Error ? error.message : "Noise suppression processing failed.";
            this.destroyHandle();
            this.clearOutputQueue();
            this.port.postMessage({
                status: "error",
                message: this.instanceErrorMessage,
            } satisfies NoiseSuppressionWorkletMessage);
            output.set(input);
        }

        return true;
    }

    private processInput(input: Float32Array, dtlnModule: DtlnModule, dtlnHandle: number): boolean {
        let inputOffset = 0;

        while (inputOffset < input.length) {
            const remainingInputCapacity = DTLN_FIXED_BUFFER_SIZE - this.inputIndex;
            const samplesToCopy = Math.min(remainingInputCapacity, input.length - inputOffset);

            this.inputBuffer.set(input.subarray(inputOffset, inputOffset + samplesToCopy), this.inputIndex);
            this.inputIndex += samplesToCopy;
            inputOffset += samplesToCopy;

            if (this.inputIndex < DTLN_FIXED_BUFFER_SIZE) {
                continue;
            }

            const isStarved = dtlnModule.dtln_denoise(dtlnHandle, this.inputBuffer, this.processingOutputBuffer);
            this.inputIndex = 0;

            if (isStarved) {
                this.consecutiveStarvedFrames += 1;

                if (this.consecutiveStarvedFrames >= MAX_CONSECUTIVE_STARVED_FRAMES) {
                    this.starved = true;
                    this.destroyHandle();
                    this.clearOutputQueue();
                    this.port.postMessage({
                        status: "starved",
                        message:
                            "Custom noise suppression was disabled automatically because it could not keep up in real time.",
                    } satisfies NoiseSuppressionWorkletMessage);
                    return false;
                }

                continue;
            }

            this.consecutiveStarvedFrames = 0;
            this.enqueueOutput(this.processingOutputBuffer.slice());
        }

        return true;
    }

    private writeOutput(output: Float32Array, fallbackInput: Float32Array): void {
        let outputOffset = 0;

        while (outputOffset < output.length && this.outputChunks.length > 0) {
            const currentChunk = this.outputChunks[0];
            const samplesAvailable = currentChunk.length - this.outputChunkOffset;
            const samplesToCopy = Math.min(samplesAvailable, output.length - outputOffset);

            output.set(
                currentChunk.subarray(this.outputChunkOffset, this.outputChunkOffset + samplesToCopy),
                outputOffset
            );

            outputOffset += samplesToCopy;
            this.outputChunkOffset += samplesToCopy;

            if (this.outputChunkOffset === currentChunk.length) {
                this.outputChunks.shift();
                this.outputChunkOffset = 0;
            }
        }

        if (outputOffset < output.length) {
            output.set(fallbackInput.subarray(outputOffset), outputOffset);
        }
    }

    private enqueueOutput(chunk: Float32Array): void {
        this.outputChunks.push(chunk);
    }

    private clearOutputQueue(): void {
        this.outputChunks.length = 0;
        this.outputChunkOffset = 0;
    }

    private loadDtlnModule(dtlnSource: string | undefined): Promise<void> {
        if (this.dtlnModuleLoadingAttempted) {
            return this.dtlnModuleLoadingPromise ?? Promise.resolve();
        }

        this.dtlnModuleLoadingAttempted = true;
        this.dtlnModuleLoadingPromise = Promise.resolve().then(() => {
            if (!dtlnSource) {
                throw new Error("Failed to load the DTLN runtime.");
            }

            const module = { exports: {} as DtlnModule };
            // eslint-disable-next-line @typescript-eslint/no-implied-eval
            const executeModule = new Function("module", "exports", `${dtlnSource}\nreturn module.exports;`) as (
                module: { exports: DtlnModule },
                exports: DtlnModule
            ) => DtlnModule;

            this.dtlnModule = executeModule(module, module.exports);
            this.dtlnModule.postRun = [
                () => {
                    this.dtlnModuleReady = true;
                    if (this.activePort) {
                        this.activePort.postMessage({ status: "ready" } satisfies NoiseSuppressionWorkletMessage);
                    }
                },
            ];
        });

        return this.dtlnModuleLoadingPromise;
    }

    private destroyHandle(): void {
        if (this.dtlnHandle === undefined) {
            return;
        }

        try {
            this.dtlnModule?.dtln_destroy?.(this.dtlnHandle);
        } catch (error) {
            console.warn("Failed to destroy the DTLN handle", error);
        } finally {
            this.dtlnHandle = undefined;
        }
    }

    private dispose(): void {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        this.destroyHandle();
        this.clearOutputQueue();
        this.inputIndex = 0;
        this.consecutiveStarvedFrames = 0;
        if (this.activePort === this.port) {
            this.activePort = undefined;
        }
        this.port.onmessage = null;
    }

    private getMonoInput(inputs: Float32Array[][]): Float32Array | undefined {
        const inputChannels = inputs[0];
        if (!inputChannels || inputChannels.length === 0) {
            return undefined;
        }

        if (inputChannels.length === 1) {
            return inputChannels[0];
        }

        const mergedInput = new Float32Array(inputChannels[0].length);
        for (const channel of inputChannels) {
            for (let index = 0; index < channel.length; index += 1) {
                mergedInput[index] += channel[index] / inputChannels.length;
            }
        }

        return mergedInput;
    }
}

registerProcessor("noise-suppression-worklet-processor", NoiseSuppressionAudioWorkletProcessor);
export {};
