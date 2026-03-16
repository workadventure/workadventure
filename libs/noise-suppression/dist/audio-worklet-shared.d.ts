import type { NoiseSuppressionModelDetails } from "./runtime";
export declare const NOISE_SUPPRESSION_AUDIO_WORKLET_PROCESSOR_NAME = "workadventure-noise-suppression";
export interface NoiseSuppressionAudioWorkletProcessorOptions {
    liteRtWasmBinary: Uint8Array;
    model1Data: Uint8Array;
    model2Data: Uint8Array;
    threads: boolean;
    numThreads: number;
    bypassUntilReady: boolean;
}
export interface NoiseSuppressionAudioWorkletReadyMessage {
    type: "ready";
    modelDetails: NoiseSuppressionModelDetails;
}
export interface NoiseSuppressionAudioWorkletErrorMessage {
    type: "error";
    message: string;
    stack?: string;
}
export interface NoiseSuppressionAudioWorkletProcessingStartedMessage {
    type: "processing-started";
    processedQuanta: number;
}
export interface NoiseSuppressionAudioWorkletBenchmarkOptions {
    warmupIterations?: number;
    benchmarkIterations?: number;
}
export interface NoiseSuppressionAudioWorkletBenchmarkSummary {
    count: number;
    totalMs: number;
    meanMs: number;
    p95Ms: number;
    minMs: number;
    maxMs: number;
}
export interface NoiseSuppressionAudioWorkletBenchmarkStartMessage {
    type: "start-benchmark";
    warmupIterations: number;
    benchmarkIterations: number;
}
export interface NoiseSuppressionAudioWorkletBenchmarkCompleteMessage {
    type: "benchmark-complete";
    frameSamples: number;
    renderQuantumSamples: number;
    summary: NoiseSuppressionAudioWorkletBenchmarkSummary;
}
export interface NoiseSuppressionAudioWorkletDisposeMessage {
    type: "dispose";
}
export type NoiseSuppressionAudioWorkletInboundMessage = NoiseSuppressionAudioWorkletDisposeMessage | NoiseSuppressionAudioWorkletBenchmarkStartMessage;
export type NoiseSuppressionAudioWorkletOutboundMessage = NoiseSuppressionAudioWorkletReadyMessage | NoiseSuppressionAudioWorkletErrorMessage | NoiseSuppressionAudioWorkletProcessingStartedMessage | NoiseSuppressionAudioWorkletBenchmarkCompleteMessage;
//# sourceMappingURL=audio-worklet-shared.d.ts.map