import rnnoiseWasmUrl from "@jitsi/rnnoise-wasm/dist/rnnoise.wasm?url";
import backgroundNoiseWorkletUrl from "./BackgroundNoiseWorkletProcessor.ts?worker&url";
import type { BackgroundNoiseMessage } from "./BackgroundNoiseWorkletProcessor";

// RNNoise needs 48 kHz: the context resamples whatever the microphone gives.
export const BACKGROUND_NOISE_SAMPLE_RATE = 48_000;

export interface BackgroundNoiseDetector {
    dispose(): void;
}

const workletModules = new WeakMap<AudioContext, Promise<void>>();
let rnnoiseWasm: Promise<ArrayBuffer> | undefined;

function loadWorkletModule(context: AudioContext): Promise<void> {
    let loaded = workletModules.get(context);
    if (loaded === undefined) {
        loaded = context.audioWorklet.addModule(backgroundNoiseWorkletUrl).catch((error: unknown) => {
            workletModules.delete(context);
            throw error;
        });
        workletModules.set(context, loaded);
    }
    return loaded;
}

function loadRnnoiseWasm(): Promise<ArrayBuffer> {
    rnnoiseWasm ??= fetch(rnnoiseWasmUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Could not load RNNoise (${response.status})`);
            }
            return response.arrayBuffer();
        })
        .catch((error: unknown) => {
            rnnoiseWasm = undefined;
            throw error;
        });
    return rnnoiseWasm;
}

/**
 * Calls onNoise when the stream picks up sustained noise without voice. Resolves once RNNoise runs; rejects if it
 * cannot. The caller keeps ownership of the stream and of the context.
 */
export async function createBackgroundNoiseDetector(
    context: AudioContext,
    stream: MediaStream,
    onNoise: () => void,
): Promise<BackgroundNoiseDetector> {
    const [, wasmBinary] = await Promise.all([loadWorkletModule(context), loadRnnoiseWasm()]);
    const node = new AudioWorkletNode(context, "background-noise-detector", { processorOptions: { wasmBinary } });
    const source = context.createMediaStreamSource(stream);
    const dispose = () => {
        source.disconnect();
        node.port.onmessage = null;
        node.onprocessorerror = null;
        node.port.postMessage("stop");
    };

    try {
        await new Promise<void>((resolve, reject) => {
            node.onprocessorerror = () => reject(new Error("The background noise processor failed"));
            node.port.onmessage = ({ data }: MessageEvent<BackgroundNoiseMessage>) => {
                if (data.type === "ready") {
                    resolve();
                } else if (data.type === "error") {
                    reject(new Error(data.message));
                } else {
                    onNoise();
                }
            };
        });
    } catch (error) {
        dispose();
        throw error;
    }

    source.connect(node);
    return { dispose };
}
