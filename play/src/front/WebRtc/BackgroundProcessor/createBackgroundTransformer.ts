import { BACKGROUND_TRANSFORMER_ENGINE } from "../../Enum/EnvironmentVariable";
import { MediaPipeTasksVisionTransformer } from "./MediaPipeTasksVisionTransformer";
import { MediaPipeBackgroundTransformer } from "./MediaPipeBackgroundTransformer";
import { FallbackBackgroundTransformer } from "./FallbackBackgroundTransformer";

export type BackgroundMode = "none" | "blur" | "image" | "video";

export interface BackgroundConfig {
    mode: BackgroundMode;
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
}

export interface BackgroundTransformer {
    updateConfig(config: Partial<BackgroundConfig>): Promise<void>;
    getPerformanceStats(): unknown;
    close(): void;
    waitForInitialization(): Promise<void>;
    transform(inputStream: MediaStream, signal?: AbortSignal): Promise<MediaStream>;
    stop(): void;
}

/**
 * Returns true if the browser supports background effects.
 * Both transformers use HTMLCanvasElement.captureStream() to produce the output stream,
 * so that is the actual capability that needs to be present.
 * For example, iOS Safari does not support captureStream() and cannot use background effects.
 */
export function isBackgroundEffectsSupported(): boolean {
    return typeof HTMLCanvasElement !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function";
}

/**
 * Create a MediaPipe-based background transformer with fallback support
 * Supports both the new Tasks Vision API (GPU-accelerated) and legacy Selfie Segmentation (CPU)
 * Selected via BACKGROUND_TRANSFORMER_ENGINE environment variable
 *
 * @param config Background configuration
 * @returns A MediaPipe transformer instance or fallback
 */
export function createBackgroundTransformer(config: BackgroundConfig): BackgroundTransformer {
    // Check browser support for MediaStream APIs
    if (!isBackgroundEffectsSupported()) {
        return new FallbackBackgroundTransformer();
    }

    const engine = BACKGROUND_TRANSFORMER_ENGINE || "tasks-vision";
    console.info(`[BackgroundProcessor] Using transformer engine: ${engine}`);

    if (engine === "tasks-vision") {
        try {
            const transformer = new MediaPipeTasksVisionTransformer(config);
            return transformer;
        } catch (error) {
            console.error("[BackgroundTransformer] Failed to create Tasks Vision transformer, using fallback:", error);
            return new FallbackBackgroundTransformer();
        }
    }

    // Use selfie-segmentation API (legacy) when engine is not "tasks-vision"
    // TODO: remove this selfie-segmentation path when tasks-vision is stable enough and universally supported
    try {
        const transformer = new MediaPipeBackgroundTransformer(config);
        return transformer;
    } catch (error) {
        console.error(
            "[BackgroundTransformer] Failed to create Selfie Segmentation transformer, using fallback:",
            error,
        );
        return new FallbackBackgroundTransformer();
    }
}
