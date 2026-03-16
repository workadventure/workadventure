import { NOISE_SUPPRESSION_AUDIO_WORKLET_PROCESSOR_NAME, type NoiseSuppressionAudioWorkletBenchmarkCompleteMessage, type NoiseSuppressionAudioWorkletBenchmarkOptions, type NoiseSuppressionAudioWorkletOutboundMessage, type NoiseSuppressionAudioWorkletProcessingStartedMessage, type NoiseSuppressionAudioWorkletReadyMessage } from "./audio-worklet-shared";
interface AudioWorkletCapableContext extends BaseAudioContext {
    readonly audioWorklet: AudioWorklet;
}
export interface NoiseSuppressionAudioWorkletOptions {
    moduleUrl?: string;
    liteRtWasmUrl?: string;
    model1Url?: string;
    model2Url?: string;
    threads?: boolean;
    numThreads?: number;
    bypassUntilReady?: boolean;
    readyTimeoutMs?: number;
}
export interface NoiseSuppressionAudioWorkletHandle {
    node: AudioWorkletNode;
    ready: Promise<NoiseSuppressionAudioWorkletReadyMessage>;
    moduleUrl: string;
    processorName: string;
    dispose(): void;
}
export declare function createNoiseSuppressionAudioWorklet(context: AudioWorkletCapableContext, options?: NoiseSuppressionAudioWorkletOptions): Promise<NoiseSuppressionAudioWorkletHandle>;
export declare function observeNoiseSuppressionAudioWorkletMessages(handle: NoiseSuppressionAudioWorkletHandle, listener: (message: NoiseSuppressionAudioWorkletOutboundMessage) => void): () => void;
export declare function isNoiseSuppressionProcessingStartedMessage(message: NoiseSuppressionAudioWorkletOutboundMessage): message is NoiseSuppressionAudioWorkletProcessingStartedMessage;
export declare function runNoiseSuppressionAudioWorkletBenchmark(handle: NoiseSuppressionAudioWorkletHandle, options?: NoiseSuppressionAudioWorkletBenchmarkOptions): Promise<NoiseSuppressionAudioWorkletBenchmarkCompleteMessage>;
export type { NoiseSuppressionAudioWorkletBenchmarkCompleteMessage, NoiseSuppressionAudioWorkletBenchmarkOptions, NoiseSuppressionAudioWorkletErrorMessage, NoiseSuppressionAudioWorkletOutboundMessage, NoiseSuppressionAudioWorkletProcessingStartedMessage, NoiseSuppressionAudioWorkletReadyMessage, } from "./audio-worklet-shared";
export { NOISE_SUPPRESSION_AUDIO_WORKLET_PROCESSOR_NAME };
//# sourceMappingURL=audio-worklet.d.ts.map