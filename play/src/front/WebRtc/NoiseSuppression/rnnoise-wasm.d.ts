// The asynchronous build of @jitsi/rnnoise-wasm (RNNoise 0.1, the one Jitsi uses for noise detection).
declare module "@jitsi/rnnoise-wasm/dist/rnnoise.js" {
    export interface RnnoiseModule {
        HEAPF32: Float32Array;
        _malloc(size: number): number;
        _free(pointer: number): void;
        _rnnoise_create(): number;
        _rnnoise_destroy(state: number): void;
        /** Denoises a 480-sample frame and returns its voice probability. */
        _rnnoise_process_frame(state: number, output: number, input: number): number;
    }

    export default function createRNNWasmModule(options: { wasmBinary: ArrayBuffer }): Promise<RnnoiseModule>;
}
