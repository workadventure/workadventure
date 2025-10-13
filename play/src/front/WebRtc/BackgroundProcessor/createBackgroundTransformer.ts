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
}

/**
 * Create a MediaPipe-based background transformer with fallback support
 *
 * @param videoTrack The video track to transform
 * @param config Background configuration
 * @param options Performance configuration
 * @returns A MediaPipe transformer instance or fallback
 */
export async function createBackgroundTransformer(
    config: BackgroundConfig,
    options?: PerformanceConfig
): Promise<BackgroundTransformer> {
    console.log("[createBackgroundTransformer] Creating MediaPipe transformer...");

    // Check if we should even try to create a transformer
    if (config.mode === "none") {
        console.log('[createBackgroundTransformer] Mode is "none", using fallback');
        return new FallbackBackgroundTransformer();
    }

    // Check browser support for MediaPipe
    if (typeof MediaStreamTrackProcessor === "undefined" || typeof MediaStreamTrackGenerator === "undefined") {
        console.warn("[createBackgroundTransformer] MediaStreamTrackProcessor API not available, using fallback");
        return new FallbackBackgroundTransformer();
    }

    try {
        // Always use MediaPipe
        const transformer = new MediaPipeBackgroundTransformer(config, options);

        // Wait for initialization to complete
        if (transformer.waitForInitialization) {
            await transformer.waitForInitialization();
        }

        console.log("[createBackgroundTransformer] Successfully created and initialized MediaPipe transformer");
        return transformer;
    } catch (error) {
        console.error("[createBackgroundTransformer] Failed to create MediaPipe transformer:", error);
        console.log("[createBackgroundTransformer] Using fallback transformer");
        return new FallbackBackgroundTransformer(videoTrack);
    }
}
