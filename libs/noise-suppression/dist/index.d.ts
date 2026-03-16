import { AUDIO_CONFIG, createNoiseSuppressionRuntime, type NoiseSuppressionModule } from "./runtime";
export interface NoiseSuppressionModuleOptions {
    liteRtWasmRoot?: string;
    model1Url?: string;
    model2Url?: string;
    threads?: boolean;
    numThreads?: number;
    logModelDetails?: boolean;
    enableProfiling?: boolean;
}
export type { AudioConfig, NoiseSuppressionModelDetails, NoiseSuppressionModule, NoiseSuppressionProfile, ProfileStageSummary, } from "./runtime";
export declare function createNoiseSuppressionModule(options?: NoiseSuppressionModuleOptions): Promise<NoiseSuppressionModule>;
export { AUDIO_CONFIG, createNoiseSuppressionRuntime };
export default createNoiseSuppressionModule;
//# sourceMappingURL=index.d.ts.map