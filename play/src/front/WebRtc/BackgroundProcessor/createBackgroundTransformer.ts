import { MediaPipeTasksVisionWorkerTransformer } from "./MediaPipeTasksVisionWorkerTransformer";
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

/** One measurement of the running pipeline; see the media.background_effect.sample analytics event. */
export type BackgroundEffectSample = {
    mode: Exclude<BackgroundMode, "none">;
    transport: "insertable-streams" | "image-bitmap";
    delegate: "GPU" | "CPU";
    model: "general" | "landscape";
    meanSegmentationMs: number;
    fps: number;
    resegmentInterval: number;
    hardwareConcurrency: number;
};

export type BackgroundEffectSampleHandler = (sample: BackgroundEffectSample) => void;

/**
 * Segmentation next to Phaser and WebRTC needs a few cores to spare, and the worker needs WebGL2 (probed on
 * the main thread here; the worker checks its own OffscreenCanvas context again).
 */
const MIN_HARDWARE_CONCURRENCY = 4;

/** Why background effects cannot run on this device, or null when they can. */
export function getBackgroundProcessingUnsupportedReason(): string | null {
    if (
        typeof Worker === "undefined" ||
        typeof OffscreenCanvas === "undefined" ||
        typeof createImageBitmap === "undefined"
    ) {
        return "required worker canvas APIs are unavailable";
    }
    // Undefined when the browser hides it: give the device the benefit of the doubt.
    const cores = navigator.hardwareConcurrency ?? MIN_HARDWARE_CONCURRENCY;
    if (cores < MIN_HARDWARE_CONCURRENCY) {
        return `only ${cores} CPU cores`;
    }
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) {
        return "WebGL2 is unavailable";
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
}

/** The browser cannot run background effects at all (no worker WebGL2, no OffscreenCanvas...). */
export class BackgroundProcessingUnsupportedError extends Error {
    constructor(reason: string) {
        super(`Background processing is not supported on this browser: ${reason}`);
        this.name = "BackgroundProcessingUnsupportedError";
    }
}

/**
 * Create a MediaPipe Tasks Vision background transformer, or a pass-through fallback
 * when the transformer cannot be constructed.
 */
export function createBackgroundTransformer(
    config: BackgroundConfig,
    onTerminalFailure?: BackgroundTransformerFailureHandler,
    onSample?: BackgroundEffectSampleHandler,
): BackgroundTransformer {
    try {
        return new MediaPipeTasksVisionWorkerTransformer(config, onTerminalFailure, onSample);
    } catch (error) {
        console.error("[BackgroundTransformer] Failed to create Tasks Vision transformer, using fallback:", error);
        return new FallbackBackgroundTransformer();
    }
}
