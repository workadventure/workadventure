import { type DType } from "../forks/litertjs-core/index.js";
declare const PROFILE_STAGES: readonly ["fft", "magnitude", "model1_tensor", "model1_invoke", "model1_read", "mask", "ifft", "model2_tensor", "model2_invoke", "model2_read", "overlap_add", "infer_total", "denoise_total"];
type ProfileStageName = (typeof PROFILE_STAGES)[number];
interface ModelTensorDetails {
    name: string;
    index: number;
    dtype: DType;
    shape: number[];
}
export interface NoiseSuppressionRuntimeOptions {
    liteRtWasmRoot: string;
    model1Url?: string;
    model2Url?: string;
    liteRtLoaderSource?: string;
    liteRtWasmBinary?: Uint8Array;
    model1Data?: Uint8Array;
    model2Data?: Uint8Array;
    threads?: boolean;
    numThreads?: number;
    logModelDetails?: boolean;
    enableProfiling?: boolean;
}
export interface NoiseSuppressionModelDetails {
    model1: {
        inputs: ModelTensorDetails[];
        outputs: ModelTensorDetails[];
    };
    model2: {
        inputs: ModelTensorDetails[];
        outputs: ModelTensorDetails[];
    };
    threads: boolean;
    numThreads: number;
    liteRtWasmRoot: string;
}
export interface ProfileStageSummary {
    count: number;
    totalMs: number;
    meanMs: number;
    p95Ms: number;
    inferShare: number;
    denoiseShare: number;
}
export interface NoiseSuppressionProfile {
    inferCalls: number;
    denoiseCalls: number;
    stages: Record<ProfileStageName, ProfileStageSummary>;
}
export interface AudioConfig {
    sampleRate: 16000;
    channels: 1;
    frameSize: 512;
    frameDuration: 32;
}
export interface NoiseSuppressionModule {
    ready: Promise<NoiseSuppressionModule>;
    modelDetails: NoiseSuppressionModelDetails;
    audioConfig: AudioConfig;
    dtln_create(): number;
    dtln_denoise(denoiser: number, inputSamples: Float32Array, outputSamples: Float32Array): boolean;
    dtln_stop(denoiser: number): void;
    dtln_destroy(denoiser: number): void;
    get_profile(denoiser: number): NoiseSuppressionProfile;
    reset_profile(denoiser: number): void;
    dtln_profile_get(denoiser: number): NoiseSuppressionProfile;
    dtln_profile_reset(denoiser: number): void;
}
declare const AUDIO_CONFIG: AudioConfig;
export declare function createNoiseSuppressionRuntime(options: NoiseSuppressionRuntimeOptions): Promise<NoiseSuppressionModule>;
export { AUDIO_CONFIG };
export default createNoiseSuppressionRuntime;
//# sourceMappingURL=runtime.d.ts.map