import { MediaPipeTasksVisionTransformer } from "./MediaPipeTasksVisionTransformer";
import { FallbackBackgroundTransformer } from "./FallbackBackgroundTransformer";

export type BackgroundMode = "none" | "blur" | "image" | "video";

export interface BackgroundConfig {
    mode: BackgroundMode;
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
    lowThreshold?: number;
    highThreshold?: number;
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
 * Uses the new Tasks Vision API, falls back to no-op transformer if it fails
 *
 * @param config Background configuration
 * @returns A MediaPipe transformer instance or fallback
 */
export function createBackgroundTransformer(config: BackgroundConfig): BackgroundTransformer {
    // Check browser support for MediaStream APIs
    if (typeof MediaStreamTrackProcessor === "undefined" || typeof MediaStreamTrackGenerator === "undefined") {
        return new FallbackBackgroundTransformer();
    }

    // Try new Tasks Vision API
    try {
        const transformer = new MediaPipeTasksVisionTransformer(config);
        return transformer;
    } catch (error) {
        console.error("[BackgroundTransformer] Failed to create Tasks Vision transformer, using fallback:", error);
        return new FallbackBackgroundTransformer();
    }
}
