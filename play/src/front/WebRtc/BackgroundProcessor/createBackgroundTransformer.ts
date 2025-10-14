import { MediaPipeBackgroundTransformer } from "./MediaPipeBackgroundTransformer";
import { FallbackBackgroundTransformer } from "./FallbackBackgroundTransformer";

export interface BackgroundConfig {
    mode: "none" | "blur" | "image" | "video";
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
}

export interface PerformanceConfig {
    targetFPS?: number;
    highQuality?: boolean;
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
 *
 * @param videoTrack The video track to transform
 * @param config Background configuration
 * @param options Performance configuration
 * @returns A MediaPipe transformer instance or fallback
 */
export function createBackgroundTransformer(
    config: BackgroundConfig,
    options?: PerformanceConfig
): BackgroundTransformer {
    // Check if we should even try to create a transformer
    if (config.mode === "none") {
        return new FallbackBackgroundTransformer();
    }

    // Check browser support for MediaPipe
    if (typeof MediaStreamTrackProcessor === "undefined" || typeof MediaStreamTrackGenerator === "undefined") {
        return new FallbackBackgroundTransformer();
    }

    try {
        // Always use MediaPipe
        const transformer = new MediaPipeBackgroundTransformer(config, options);
        return transformer;
    } catch (error) {
        console.error("Failed to create MediaPipe transformer:", error);
        return new FallbackBackgroundTransformer();
    }
}
