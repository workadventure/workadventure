import createRNNWasmModule from "@jitsi/rnnoise-wasm/dist/rnnoise.js";
import type { RnnoiseModule } from "@jitsi/rnnoise-wasm/dist/rnnoise.js";
import { BackgroundNoiseRule, NOISY_RMS } from "./BackgroundNoiseRule";

export type BackgroundNoiseMessage = { type: "ready" } | { type: "noise" } | { type: "error"; message: string };

// RNNoise processes 10 ms frames at 48 kHz, as 16-bit sample values.
const FRAME_SAMPLES = 480;
const SHIFT_16_BIT = 32768;

/**
 * Runs RNNoise on the microphone for its voice probability only (the denoised frame is discarded), and posts "noise"
 * once the background stays loud. Everything runs on the audio thread: only the messages reach the page.
 */
class BackgroundNoiseWorkletProcessor extends AudioWorkletProcessor {
    private readonly frame = new Float32Array(FRAME_SAMPLES);
    private filled = 0;
    private readonly rule = new BackgroundNoiseRule();
    private rnnoise: { module: RnnoiseModule; state: number; buffer: number } | undefined;
    private stopped = false;

    constructor(options?: AudioWorkletNodeOptions) {
        super();
        const { wasmBinary } = options?.processorOptions as { wasmBinary: ArrayBuffer };
        createRNNWasmModule({ wasmBinary }).then(
            (module) => {
                if (this.stopped) {
                    return;
                }
                this.rnnoise = {
                    module,
                    state: module._rnnoise_create(),
                    buffer: module._malloc(FRAME_SAMPLES * Float32Array.BYTES_PER_ELEMENT),
                };
                this.post({ type: "ready" });
            },
            (error: unknown) => this.post({ type: "error", message: String(error) }),
        );
        this.port.onmessage = () => this.stop();
    }

    process(inputs: Float32Array[][]): boolean {
        const channel = inputs[0]?.[0];
        if (channel === undefined || this.rnnoise === undefined) {
            return !this.stopped;
        }

        for (const sample of channel) {
            this.frame[this.filled++] = sample;
            if (this.filled === FRAME_SAMPLES) {
                this.filled = 0;
                if (this.processFrame(this.rnnoise)) {
                    this.post({ type: "noise" });
                    this.stop();
                    break;
                }
            }
        }
        return !this.stopped;
    }

    private processFrame({ module, state, buffer }: { module: RnnoiseModule; state: number; buffer: number }): boolean {
        // HEAPF32 is read at each frame: the module replaces it when its memory grows.
        const heap = module.HEAPF32;
        const offset = buffer / Float32Array.BYTES_PER_ELEMENT;
        let sumOfSquares = 0;
        for (let i = 0; i < FRAME_SAMPLES; i++) {
            const sample = this.frame[i];
            heap[offset + i] = sample * SHIFT_16_BIT;
            sumOfSquares += sample * sample;
        }
        const rms = Math.sqrt(sumOfSquares / FRAME_SAMPLES);
        // A quiet frame cannot make the background noisy: it counts as background without running RNNoise (3 % of a
        // core), so a silent user in a quiet room costs nothing.
        const vad = rms > NOISY_RMS ? module._rnnoise_process_frame(state, buffer, buffer) : 0;
        return this.rule.push(vad, rms);
    }

    private stop(): void {
        this.stopped = true;
        if (this.rnnoise !== undefined) {
            this.rnnoise.module._rnnoise_destroy(this.rnnoise.state);
            this.rnnoise.module._free(this.rnnoise.buffer);
            this.rnnoise = undefined;
        }
    }

    private post(message: BackgroundNoiseMessage): void {
        this.port.postMessage(message);
    }
}

registerProcessor("background-noise-detector", BackgroundNoiseWorkletProcessor);
