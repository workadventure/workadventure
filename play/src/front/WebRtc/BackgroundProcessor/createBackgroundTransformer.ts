import { MediaPipeTasksVisionTransformer } from "./MediaPipeTasksVisionTransformer";
import { FallbackBackgroundTransformer } from "./FallbackBackgroundTransformer";

export const BACKGROUND_MODES = ["none", "blur", "image"] as const;
export type BackgroundMode = (typeof BACKGROUND_MODES)[number];

export function isBackgroundMode(value: unknown): value is BackgroundMode {
    return (BACKGROUND_MODES as readonly unknown[]).includes(value);
}

export interface BackgroundConfig {
    mode: BackgroundMode;
    blurAmount?: number;
    backgroundImage?: string;
}

export interface BackgroundTransformer {
    updateConfig(config: Partial<BackgroundConfig>): Promise<void>;
    getPerformanceStats(): unknown;
    close(): void;
    waitForInitialization(): Promise<void>;
    transform(inputStream: MediaStream, signal?: AbortSignal): Promise<MediaStream>;
    stop(): void;
}

export type BackgroundTransformerFailureHandler = (error: Error) => void;

/**
 * Create a MediaPipe Tasks Vision background transformer, or a pass-through fallback
 * when the transformer cannot be constructed.
 */
export function createBackgroundTransformer(
    config: BackgroundConfig,
    onTerminalFailure?: BackgroundTransformerFailureHandler,
): BackgroundTransformer {
    try {
        return new MediaPipeTasksVisionTransformer(config, onTerminalFailure);
    } catch (error) {
        console.error("[BackgroundTransformer] Failed to create Tasks Vision transformer, using fallback:", error);
        return new FallbackBackgroundTransformer();
    }
}
