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
    transform(inputStream: MediaStream): Promise<MediaStream>;
    stop(): void;
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
    if (typeof MediaStreamTrackProcessor === "undefined" || typeof MediaStreamTrackGenerator === "undefined") {
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
            error
        );
        return new FallbackBackgroundTransformer();
    }
}
