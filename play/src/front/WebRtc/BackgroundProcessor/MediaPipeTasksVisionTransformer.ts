import type { MPMask } from "@mediapipe/tasks-vision";
import { ImageSegmenter, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { AbortError } from "@workadventure/shared-utils/src/Abort/AbortError";
import { raceAbort } from "@workadventure/shared-utils/src/Abort/raceAbort";
import { isFirefox, isIOS } from "../DeviceUtils";
import { CanvasBlurRenderer, type BlurBackend } from "./CanvasBlurRenderer";
import { logOnce } from "./logOnce";
import { TasksVisionBlurCompositor } from "./TasksVisionBlurCompositor";
import type {
    BackgroundConfig,
    BackgroundTransformer,
    BackgroundTransformerFailureHandler,
} from "./createBackgroundTransformer";

const DEFAULT_FRAME_RATE = 30;
const MAX_CONSECUTIVE_RECOVERY_ATTEMPTS = 2;
const SUCCESSFUL_FRAMES_BEFORE_RECOVERY_RESET = 30;

type CaptureBackend = "webgl-capture" | "2d-copy-capture";

function logCaptureBackend(backend: CaptureBackend): void {
    logOnce(`tasks-vision-capture:${backend}`, () =>
        console.info(
            backend === "webgl-capture"
                ? "[MediaPipe Tasks Vision] Using WebGL canvas capture backend."
                : "[MediaPipe Tasks Vision] Using 2D copy canvas capture backend.",
        ),
    );
}

function logWebGlCaptureFailure(error: unknown): void {
    logOnce("tasks-vision-capture:webgl-failure", () =>
        console.warn("[MediaPipe Tasks Vision] WebGL canvas capture failed; falling back to 2D copy capture.", error),
    );
}

/**
 * captureStream() from a WebGL canvas produces frozen frames on WebKit (Safari and
 * every iOS browser), so the direct WebGL capture path is restricted to engines
 * known to capture WebGL canvases correctly. Engines we cannot positively identify
 * fall back to the always-working 2D-copy path rather than risking a frozen feed.
 */
function supportsWebGlCanvasCapture(): boolean {
    if (isIOS()) {
        return false;
    }

    // Chromium-based engines report "Chrome" in their UA (Safari does not); iOS
    // Chrome/Firefox use "CriOS"/"FxiOS" and are already excluded by isIOS().
    const isChromium = navigator.userAgent.includes("Chrome");
    return isChromium || isFirefox();
}

/**
 * MediaPipe Tasks Vision-based background transformer for video streams
 * Uses the modern @mediapipe/tasks-vision API with ImageSegmenter
 * All compositing is done in WebGL for optimal performance
 */
export class MediaPipeTasksVisionTransformer implements BackgroundTransformer {
    // WebGL canvas shared between ImageSegmenter, DrawingUtils and the blur compositor.
    private glCanvas: HTMLCanvasElement;
    private gl: WebGL2RenderingContext | null = null;
    private drawingUtils: DrawingUtils | null = null;
    private blurCompositor: TasksVisionBlurCompositor | null = null;

    // Output canvas used when direct WebGL capture is unavailable or disabled.
    private outputCanvas: HTMLCanvasElement;
    private outputCtx: CanvasRenderingContext2D;

    private imageSegmenter: ImageSegmenter | null = null;
    private filesetResolver: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null;
    private backgroundImage: HTMLImageElement | null = null;
    private backgroundVideo: HTMLVideoElement | null = null;
    private outputStream: MediaStream | null = null;
    private inputVideo: HTMLVideoElement;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private closed = false;
    private frameCount = 0;
    private startTime = performance.now();
    private initPromise: Promise<void>;
    private frameRate = DEFAULT_FRAME_RATE;
    private frameIntervalMs = 1000 / DEFAULT_FRAME_RATE;
    private lastTimestampMs = -1;
    private recoveryPromise: Promise<void> | null = null;
    private consecutiveRecoveryAttempts = 0;
    private successfulFramesSinceRecovery = 0;

    // Canvas for background image (pre-rendered to avoid GPU re-upload each frame)
    private backgroundCanvas: HTMLCanvasElement | null = null;
    private backgroundCanvasCtx: CanvasRenderingContext2D | null = null;

    // Fallback canvases used only when the dedicated blur compositor is unavailable.
    private fallbackBlurredCanvas: HTMLCanvasElement | null = null;
    private fallbackBlurredCtx: CanvasRenderingContext2D | null = null;
    private foregroundCanvas: HTMLCanvasElement | null = null;
    private foregroundCtx: CanvasRenderingContext2D | null = null;
    private blurRenderer = new CanvasBlurRenderer();
    private blurBackend: BlurBackend = "none";
    private captureBackend: CaptureBackend = "2d-copy-capture";
    private directWebGlCaptureUnavailable = false;

    constructor(
        private config: BackgroundConfig,
        private readonly onTerminalFailure?: BackgroundTransformerFailureHandler,
    ) {
        // Create WebGL canvas for MediaPipe (shared with ImageSegmenter and DrawingUtils)
        this.glCanvas = this.createGlCanvas();

        // Create output canvas for stream capture (2D context for captureStream compatibility)
        this.outputCanvas = document.createElement("canvas");
        this.outputCtx = this.outputCanvas.getContext("2d", {
            alpha: false,
            desynchronized: true,
        })!;

        this.inputVideo = document.createElement("video");
        this.inputVideo.autoplay = true;
        this.inputVideo.muted = true;
        this.inputVideo.playsInline = true;

        // Initialize MediaPipe
        this.initPromise = this.initialize();
    }

    private async initialize(): Promise<void> {
        try {
            await this.initializeMediaPipe();
            await this.loadBackgroundResources();
        } catch (error) {
            console.error("[MediaPipe Tasks Vision] Initialization failed:", error);
            throw error;
        }
    }

    private async initializeMediaPipe(): Promise<void> {
        // Use local WASM files
        const wasmPath = "./static/tasksVision/wasm";
        this.filesetResolver = await FilesetResolver.forVisionTasks(wasmPath);

        // Use local selfie segmentation model
        const modelPath = "./static/tasksVision/selfie_segmenter.tflite";

        // Try GPU first, fallback to CPU if it fails
        try {
            this.imageSegmenter = await ImageSegmenter.createFromOptions(this.filesetResolver, {
                baseOptions: {
                    modelAssetPath: modelPath,
                    delegate: "GPU",
                },
                canvas: this.glCanvas, // Share the WebGL canvas with the segmenter
                runningMode: "VIDEO",
                outputCategoryMask: false,
                outputConfidenceMasks: true, // Use confidence masks for drawConfidenceMask
            });

            console.info("[MediaPipe Tasks Vision] Initialized successfully with GPU");
        } catch (gpuError) {
            console.warn("[MediaPipe Tasks Vision] GPU initialization failed, falling back to CPU:", gpuError);

            try {
                this.imageSegmenter = await ImageSegmenter.createFromOptions(this.filesetResolver, {
                    baseOptions: {
                        modelAssetPath: modelPath,
                        delegate: "CPU",
                    },
                    canvas: this.glCanvas, // Share the WebGL canvas with the segmenter
                    runningMode: "VIDEO",
                    outputCategoryMask: false,
                    outputConfidenceMasks: true,
                });

                console.info("[MediaPipe Tasks Vision] Initialized successfully with CPU fallback");
            } catch (cpuError) {
                console.error("[MediaPipe Tasks Vision] Both GPU and CPU initialization failed:", cpuError);
                throw cpuError;
            }
        }

        // Get WebGL context from the shared canvas and create DrawingUtils
        this.gl = this.glCanvas.getContext("webgl2");
        if (!this.gl) {
            throw new Error("[MediaPipe Tasks Vision] WebGL2 is not supported");
        }

        // Create DrawingUtils with the same WebGL context
        this.drawingUtils = new DrawingUtils(this.gl);
        this.blurCompositor = new TasksVisionBlurCompositor(this.gl, this.glCanvas);
    }

    private createGlCanvas(): HTMLCanvasElement {
        return document.createElement("canvas");
    }

    private initializeFallbackBlurredCanvas(): void {
        this.fallbackBlurredCanvas = document.createElement("canvas");
        this.fallbackBlurredCtx = this.fallbackBlurredCanvas.getContext("2d")!;
    }

    private initializeForegroundCanvas(): void {
        this.foregroundCanvas = document.createElement("canvas");
        this.foregroundCtx = this.foregroundCanvas.getContext("2d")!;
    }

    private initializeBackgroundCanvas(): void {
        this.backgroundCanvas = document.createElement("canvas");
        this.backgroundCanvasCtx = this.backgroundCanvas.getContext("2d")!;
    }

    private async loadBackgroundResources(): Promise<void> {
        if (this.config.mode === "image" && this.config.backgroundImage) {
            this.backgroundImage = new Image();
            this.backgroundImage.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
                this.backgroundImage!.onload = () => resolve();
                this.backgroundImage!.onerror = () => reject(new Error("Failed to load background image"));
                this.backgroundImage!.src = this.config.backgroundImage!;
            });

            // Pre-render background image to canvas for better GPU performance
            // (HTMLCanvasElement avoids re-uploading texture each frame)
            this.initializeBackgroundCanvas();
        }

        if (this.config.mode === "video" && this.config.backgroundVideo) {
            this.backgroundVideo = document.createElement("video");
            this.backgroundVideo.crossOrigin = "anonymous";
            this.backgroundVideo.loop = true;
            this.backgroundVideo.muted = true;
            this.backgroundVideo.autoplay = true;
            this.backgroundVideo.src = this.config.backgroundVideo;
            await this.backgroundVideo.play();
        }
    }

    private processFrame(): void {
        if (this.closed || !this.outputStream || this.config.mode === "none" || !this.imageSegmenter) {
            return;
        }

        const { width, height } = this.outputCanvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            this.scheduleNextFrame();
            return;
        }

        // Check if video has valid dimensions
        const videoWidth = this.inputVideo.videoWidth;
        const videoHeight = this.inputVideo.videoHeight;

        if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
            this.scheduleNextFrame();
            return;
        }

        if (this.inputVideo.readyState < 2) {
            // Video not ready yet, retry
            this.scheduleNextFrame();
            return;
        }

        try {
            // The Tasks Vision API expects milliseconds and requires monotonically increasing values.
            const timestampMs = Math.max(performance.now(), this.lastTimestampMs + 1);
            this.lastTimestampMs = timestampMs;

            // Segment the current video frame
            const result = this.imageSegmenter.segmentForVideo(this.inputVideo, timestampMs);
            try {
                if (result.confidenceMasks && result.confidenceMasks.length > 0) {
                    this.processResults(result.confidenceMasks[0]);
                }
                // Silently skip if no mask - this can happen occasionally and is not critical
            } finally {
                result.close();
            }

            this.markSuccessfulFrame();
            this.scheduleNextFrame();
        } catch (error) {
            this.startRecovery(error);
        }
    }

    private scheduleNextFrame(): void {
        this.cancelScheduledFrame();
        if (this.closed || !this.outputStream || this.config.mode === "none") {
            return;
        }
        this.timeoutId = setTimeout(() => this.processFrame(), this.frameIntervalMs);
    }

    private cancelScheduledFrame(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    private markSuccessfulFrame(): void {
        if (this.consecutiveRecoveryAttempts === 0) {
            return;
        }

        this.successfulFramesSinceRecovery++;
        if (this.successfulFramesSinceRecovery >= SUCCESSFUL_FRAMES_BEFORE_RECOVERY_RESET) {
            this.consecutiveRecoveryAttempts = 0;
            this.successfulFramesSinceRecovery = 0;
        }
    }

    private startRecovery(error: unknown): void {
        if (this.closed || this.recoveryPromise) {
            return;
        }

        this.cancelScheduledFrame();
        const errorMessage = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        const inputTrack =
            this.inputVideo.srcObject instanceof MediaStream
                ? this.inputVideo.srcObject.getVideoTracks()[0]
                : undefined;
        console.error(
            `[MediaPipe Tasks Vision] Frame processing failed: ${errorMessage}; ` +
                `timestampMs=${this.lastTimestampMs}; videoTime=${this.inputVideo.currentTime}; ` +
                `readyState=${this.inputVideo.readyState}; trackState=${inputTrack?.readyState ?? "unavailable"}; ` +
                `visibility=${document.visibilityState}; webGlContextLost=${this.gl?.isContextLost() ?? true}`,
        );

        this.recoveryPromise = this.recoverMediaPipe()
            .catch((recoveryError: unknown) => {
                const recoveryErrorMessage =
                    recoveryError instanceof Error
                        ? `${recoveryError.name}: ${recoveryError.message}`
                        : String(recoveryError);
                console.error(`[MediaPipe Tasks Vision] Recovery failed: ${recoveryErrorMessage}`);

                const terminalError = new Error("MediaPipe Tasks Vision recovery failed", {
                    cause: recoveryError,
                });
                this.close();
                try {
                    this.onTerminalFailure?.(terminalError);
                } catch (callbackError) {
                    console.error("[MediaPipe Tasks Vision] Terminal failure handler failed:", callbackError);
                }
            })
            .finally(() => {
                this.recoveryPromise = null;
            });
    }

    private async recoverMediaPipe(): Promise<void> {
        if (this.closed || this.consecutiveRecoveryAttempts >= MAX_CONSECUTIVE_RECOVERY_ATTEMPTS) {
            throw new Error("MediaPipe recovery attempts exhausted");
        }

        if (this.captureBackend === "webgl-capture") {
            throw new Error("Cannot replace a WebGL canvas while its video track is being captured");
        }

        this.consecutiveRecoveryAttempts++;
        this.successfulFramesSinceRecovery = 0;

        this.disposeMediaPipeResources();
        this.glCanvas = this.createGlCanvas();
        this.glCanvas.width = this.outputCanvas.width;
        this.glCanvas.height = this.outputCanvas.height;

        try {
            await this.initializeMediaPipe();
        } catch (error) {
            if (this.consecutiveRecoveryAttempts >= MAX_CONSECUTIVE_RECOVERY_ATTEMPTS) {
                throw error;
            }
            return this.recoverMediaPipe();
        }

        if (this.closed) {
            this.disposeMediaPipeResources();
            return;
        }
        if (!this.outputStream || this.config.mode === "none") {
            return;
        }

        console.info(
            `[MediaPipe Tasks Vision] Recovered after attempt ${this.consecutiveRecoveryAttempts}/${MAX_CONSECUTIVE_RECOVERY_ATTEMPTS}`,
        );
        this.scheduleNextFrame();
    }

    private processResults(mask: MPMask): void {
        if (this.closed) {
            return;
        }

        const { width, height } = this.outputCanvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            console.warn(
                `[MediaPipe Tasks Vision] Skipping frame processing: canvas dimensions are ${width}x${height}`,
            );
            return;
        }

        if (this.config.mode === "blur") {
            this.processBlurMode(mask);
        } else if (this.config.mode === "image" || this.config.mode === "video") {
            this.processReplaceMode(mask);
        } else {
            throw new Error(`[MediaPipe Tasks Vision] Unknown mode: ${this.config.mode}`);
        }

        // Submit WebGL operations before copying to the stable capture canvas.
        if (this.gl) {
            this.gl.flush();
        }
        if (this.captureBackend === "2d-copy-capture") {
            this.outputCtx.drawImage(this.glCanvas, 0, 0, width, height);
        }

        this.frameCount++;
    }

    private processBlurMode(mask: MPMask): void {
        const { width, height } = this.outputCanvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            return;
        }

        if (this.blurCompositor?.draw(this.inputVideo, mask, width, height, this.config.blurAmount || 15)) {
            this.blurBackend = "webgl-blur";
            return;
        }

        if (!this.drawingUtils) {
            this.blurBackend = "none";
            return;
        }

        if (!this.fallbackBlurredCanvas || !this.fallbackBlurredCtx) {
            this.initializeFallbackBlurredCanvas();
        }
        if (!this.foregroundCanvas || !this.foregroundCtx) {
            this.initializeForegroundCanvas();
        }

        // Ensure canvas dimensions match
        if (this.fallbackBlurredCanvas!.width !== width || this.fallbackBlurredCanvas!.height !== height) {
            this.fallbackBlurredCanvas!.width = width;
            this.fallbackBlurredCanvas!.height = height;
        }
        if (this.foregroundCanvas!.width !== width || this.foregroundCanvas!.height !== height) {
            this.foregroundCanvas!.width = width;
            this.foregroundCanvas!.height = height;
        }

        this.blurBackend = this.blurRenderer.drawBlurredImage(
            this.fallbackBlurredCtx!,
            this.inputVideo,
            width,
            height,
            this.config.blurAmount || 15,
        );

        // Draw current video frame to foreground canvas (HTMLCanvasElement is faster than HTMLVideoElement)
        this.foregroundCtx!.drawImage(this.inputVideo, 0, 0, width, height);

        // Use DrawingUtils to composite:
        // - defaultTexture (low confidence = background) = blurred canvas
        // - overlayTexture (high confidence = person) = foreground canvas
        this.drawingUtils.drawConfidenceMask(
            mask,
            this.fallbackBlurredCanvas!, // Background: blurred video
            this.foregroundCanvas!, // Foreground: sharp person
        );
    }

    private processReplaceMode(mask: MPMask): void {
        const { width, height } = this.outputCanvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0 || !this.drawingUtils) {
            return;
        }

        // Ensure foreground canvas is initialized and sized
        if (!this.foregroundCanvas || !this.foregroundCtx) {
            this.initializeForegroundCanvas();
        }
        if (this.foregroundCanvas!.width !== width || this.foregroundCanvas!.height !== height) {
            this.foregroundCanvas!.width = width;
            this.foregroundCanvas!.height = height;
        }

        // Draw current video frame to foreground canvas (HTMLCanvasElement is faster than HTMLVideoElement)
        this.foregroundCtx!.drawImage(this.inputVideo, 0, 0, width, height);

        // Get the background source (canvas for image, video element for video)
        const backgroundSource = this.getBackgroundSource(width, height);

        if (backgroundSource) {
            // Use DrawingUtils to composite:
            // - defaultTexture (low confidence = background) = background canvas/video
            // - overlayTexture (high confidence = person) = foreground canvas
            // Using HTMLCanvasElement instead of HTMLImageElement/HTMLVideoElement avoids GPU texture re-upload
            this.drawingUtils.drawConfidenceMask(
                mask,
                backgroundSource, // Background: replacement image (as canvas) or video
                this.foregroundCanvas!, // Foreground: sharp person (canvas for better perf)
            );
        } else {
            // Fallback: solid black background
            this.drawingUtils.drawConfidenceMask(
                mask,
                [0, 0, 0, 255], // Black background
                this.foregroundCanvas!,
            );
        }
    }

    /**
     * Get the appropriate background source based on mode.
     * Returns HTMLCanvasElement for images (better GPU performance - avoids re-upload each frame)
     * Returns HTMLVideoElement for videos (needs to update each frame anyway)
     */
    private getBackgroundSource(width: number, height: number): HTMLCanvasElement | HTMLVideoElement | null {
        if (this.config.mode === "image" && this.backgroundImage) {
            // Use pre-rendered canvas for static images (avoids GPU re-upload)
            if (!this.backgroundCanvas || !this.backgroundCanvasCtx) {
                this.initializeBackgroundCanvas();
            }

            // Update background canvas dimensions and redraw if needed
            if (this.backgroundCanvas!.width !== width || this.backgroundCanvas!.height !== height) {
                this.backgroundCanvas!.width = width;
                this.backgroundCanvas!.height = height;

                // Scale image to fit canvas while maintaining aspect ratio (cover)
                const scale = Math.max(width / this.backgroundImage.width, height / this.backgroundImage.height);
                const scaledWidth = this.backgroundImage.width * scale;
                const scaledHeight = this.backgroundImage.height * scale;
                const x = (width - scaledWidth) / 2;
                const y = (height - scaledHeight) / 2;

                this.backgroundCanvasCtx!.drawImage(this.backgroundImage, x, y, scaledWidth, scaledHeight);
            }

            return this.backgroundCanvas!;
        }
        if (this.config.mode === "video" && this.backgroundVideo) {
            // For video, we still use HTMLVideoElement as it updates each frame anyway
            // TODO: Could optimize by using a canvas here too if needed
            return this.backgroundVideo;
        }
        return null;
    }

    public async waitForInitialization(): Promise<void> {
        await this.initPromise;
    }

    public async updateConfig(config: Partial<typeof this.config>): Promise<void> {
        // Update configuration
        Object.assign(this.config, config);

        // Reload background resources if needed
        if (config.backgroundImage || config.backgroundVideo) {
            await this.loadBackgroundResources();
        }
    }

    public getPerformanceStats() {
        const elapsed = performance.now() - this.startTime;
        const fps = this.frameCount > 0 && elapsed > 0 ? Math.round((this.frameCount / elapsed) * 1000) : 0;

        return {
            fps,
            frameCount: this.frameCount,
            elapsed: Math.round(elapsed),
            closed: this.closed,
            blurBackend: this.config.mode === "blur" ? this.blurBackend : "none",
            captureBackend: this.captureBackend,
        };
    }

    public stop(): void {
        this.cancelScheduledFrame();
    }

    public close(): void {
        this.closed = true;

        this.cancelScheduledFrame();

        // Stop output stream
        if (this.outputStream) {
            this.outputStream.getVideoTracks().forEach((track) => track.stop());
            this.outputStream = null;
        }

        this.disposeMediaPipeResources();

        // Clean up resources
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = "";
            this.backgroundVideo = null;
        }
        this.backgroundImage = null;

        // Clean up fallback canvases
        this.fallbackBlurredCanvas = null;
        this.fallbackBlurredCtx = null;

        // Clean up background canvas
        this.backgroundCanvas = null;
        this.backgroundCanvasCtx = null;

        // Clean up foreground canvas
        this.foregroundCanvas = null;
        this.foregroundCtx = null;

        this.blurRenderer.close();
        this.inputVideo.pause();
        this.inputVideo.srcObject = null;
    }

    private disposeMediaPipeResources(): void {
        this.blurCompositor?.close();
        this.blurCompositor = null;

        if (this.drawingUtils) {
            try {
                this.drawingUtils.close();
            } catch (error) {
                console.warn("[MediaPipe Tasks Vision] Error closing DrawingUtils:", error);
            }
            this.drawingUtils = null;
        }

        if (this.imageSegmenter) {
            try {
                this.imageSegmenter.close();
            } catch (error) {
                console.warn("[MediaPipe Tasks Vision] Error closing segmenter:", error);
            }
            this.imageSegmenter = null;
        }

        if (this.gl) {
            // This extension only releases the transformer's context; Phaser uses a different canvas/context.
            this.gl.getExtension("WEBGL_lose_context")?.loseContext();
        }
        this.gl = null;
    }

    public async transform(inputStream: MediaStream, signal?: AbortSignal): Promise<MediaStream> {
        this.frameRate = inputStream.getVideoTracks()[0]?.getSettings().frameRate || DEFAULT_FRAME_RATE;
        this.frameIntervalMs = 1000 / this.frameRate;
        await this.initPromise;
        if (this.recoveryPromise) {
            await raceAbort(this.recoveryPromise, signal);
        }
        if (signal?.aborted) {
            throw signal.reason ?? new AbortError("Transform aborted after initialization");
        }

        if (this.config.mode === "none") {
            return inputStream;
        }

        // Setup input video
        this.inputVideo.srcObject = inputStream;

        // Wait for video metadata to be loaded
        const loadedMetadataPromise = new Promise<void>((resolve) => {
            if (this.inputVideo.readyState >= 2) {
                resolve();
            } else {
                this.inputVideo.addEventListener("loadedmetadata", () => resolve(), { once: true });
            }
        });
        await raceAbort(loadedMetadataPromise, signal);
        if (signal?.aborted) {
            throw signal.reason ?? new AbortError("Transform aborted while waiting for video metadata");
        }

        const playPromise = this.inputVideo.play();
        await raceAbort(playPromise, signal);
        if (signal?.aborted) {
            throw signal.reason ?? new AbortError("Transform aborted while starting video playback");
        }

        // Setup canvas dimensions
        const videoWidth = this.inputVideo.videoWidth;
        const videoHeight = this.inputVideo.videoHeight;

        // Check for invalid dimensions (0x0 or undefined)
        if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
            const errorMessage = `[MediaPipe Tasks Vision] Invalid video dimensions: ${videoWidth}x${videoHeight}. Cannot process stream with 0x0 size.`;
            throw new Error(errorMessage);
        }
        if (signal?.aborted) {
            throw signal.reason ?? new AbortError("Transform aborted before starting processing");
        }

        // Set dimensions for both canvases
        this.glCanvas.width = videoWidth;
        this.glCanvas.height = videoHeight;
        this.outputCanvas.width = videoWidth;
        this.outputCanvas.height = videoHeight;

        if (this.outputStream) {
            for (const track of this.outputStream.getVideoTracks()) {
                track.stop();
            }
        }

        this.outputStream = this.createOutputStream();

        // Copy audio tracks from the original stream
        for (const audioTrack of inputStream.getAudioTracks()) {
            this.outputStream.addTrack(audioTrack);
        }

        // Stop any existing processing loop before starting a new one
        // This prevents race conditions when transform() is called multiple times
        this.cancelScheduledFrame();

        // Start processing loop
        this.processFrame();

        return this.outputStream;
    }

    private createOutputStream(): MediaStream {
        if (this.canAttemptWebGlCapture()) {
            try {
                const stream = this.glCanvas.captureStream(this.frameRate);
                if (stream.getVideoTracks().length > 0) {
                    this.captureBackend = "webgl-capture";
                    logCaptureBackend(this.captureBackend);
                    return stream;
                }

                this.directWebGlCaptureUnavailable = true;
                logWebGlCaptureFailure(new Error("WebGL canvas capture returned no video track"));
            } catch (error) {
                this.directWebGlCaptureUnavailable = true;
                logWebGlCaptureFailure(error);
            }
        }

        this.captureBackend = "2d-copy-capture";
        logCaptureBackend(this.captureBackend);
        return this.outputCanvas.captureStream(this.frameRate);
    }

    private canAttemptWebGlCapture(): boolean {
        if (this.directWebGlCaptureUnavailable || typeof this.glCanvas.captureStream !== "function") {
            return false;
        }

        return supportsWebGlCanvasCapture();
    }
}
