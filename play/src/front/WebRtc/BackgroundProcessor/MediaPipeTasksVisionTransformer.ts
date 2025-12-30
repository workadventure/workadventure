import type { MPMask } from "@mediapipe/tasks-vision";
import { ImageSegmenter, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import type { BackgroundConfig, BackgroundTransformer } from "./createBackgroundTransformer";

/**
 * MediaPipe Tasks Vision-based background transformer for video streams
 * Uses the modern @mediapipe/tasks-vision API with ImageSegmenter and DrawingUtils
 * All compositing is done in WebGL for optimal performance
 */
export class MediaPipeTasksVisionTransformer implements BackgroundTransformer {
    // WebGL canvas shared between ImageSegmenter and DrawingUtils
    private glCanvas: HTMLCanvasElement;
    private gl: WebGL2RenderingContext | null = null;
    private drawingUtils: DrawingUtils | null = null;

    // Output canvas for stream capture (we copy from glCanvas to this)
    private outputCanvas: HTMLCanvasElement;
    private outputCtx: CanvasRenderingContext2D;

    private imageSegmenter: ImageSegmenter | null = null;
    private filesetResolver: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>> | null = null;
    private isInitialized = false;
    private backgroundImage: HTMLImageElement | null = null;
    private backgroundVideo: HTMLVideoElement | null = null;
    private outputStream: MediaStream | null = null;
    private inputVideo: HTMLVideoElement;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;
    private closed = false;
    private frameCount = 0;
    private startTime = performance.now();
    private initPromise: Promise<void>;
    private frameRate = 33;
    // Use a global timestamp that never resets to ensure monotonic timestamps for MediaPipe
    private globalStartTime = performance.now();
    // Track the last timestamp to guarantee strict monotonic increase
    private lastTimestampMicroseconds = 0;

    // Canvas for blurred background (used as texture source for DrawingUtils)
    private blurredCanvas: HTMLCanvasElement | null = null;
    private blurredCtx: CanvasRenderingContext2D | null = null;

    // Canvas for background image (pre-rendered to avoid GPU re-upload each frame)
    private backgroundCanvas: HTMLCanvasElement | null = null;
    private backgroundCanvasCtx: CanvasRenderingContext2D | null = null;

    // Canvas for foreground video (updated each frame, but HTMLCanvasElement is faster than HTMLVideoElement)
    private foregroundCanvas: HTMLCanvasElement | null = null;
    private foregroundCtx: CanvasRenderingContext2D | null = null;

    constructor(private config: BackgroundConfig) {
        // Create WebGL canvas for MediaPipe (shared with ImageSegmenter and DrawingUtils)
        this.glCanvas = document.createElement("canvas");

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
        if (this.isInitialized) return;

        try {
            await this.initializeMediaPipe();
            await this.loadBackgroundResources();
            // Initialize canvases for optimized rendering
            this.initializeBlurredCanvas();
            this.initializeForegroundCanvas();
            this.isInitialized = true;
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
    }

    private initializeBlurredCanvas(): void {
        this.blurredCanvas = document.createElement("canvas");
        this.blurredCtx = this.blurredCanvas.getContext("2d")!;
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
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
            return;
        }

        // Check if video has valid dimensions
        const videoWidth = this.inputVideo.videoWidth;
        const videoHeight = this.inputVideo.videoHeight;

        if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
            return;
        }

        if (this.inputVideo.readyState < 2) {
            // Video not ready yet, retry
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
            return;
        }

        try {
            // Calculate timestamp in microseconds (MediaPipe requires microseconds)
            // Use a global timestamp that never resets to ensure strict monotonic increase
            // This is critical: MediaPipe requires timestamps to be STRICTLY increasing
            const currentTime = performance.now();
            let timestampMicroseconds = Math.floor((currentTime - this.globalStartTime) * 1000);

            // Ensure timestamp is strictly greater than the last one
            // performance.now() can return the same value on rapid calls, causing MediaPipe errors
            if (timestampMicroseconds <= this.lastTimestampMicroseconds) {
                timestampMicroseconds = this.lastTimestampMicroseconds + 1;
            }
            this.lastTimestampMicroseconds = timestampMicroseconds;

            // Segment the current video frame
            const result = this.imageSegmenter.segmentForVideo(this.inputVideo, timestampMicroseconds);

            if (result.confidenceMasks && result.confidenceMasks.length > 0) {
                this.processResults(result.confidenceMasks[0]);
            }
            // Silently skip if no mask - this can happen occasionally and is not critical

            // Schedule next frame
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
        } catch (error) {
            console.error("[MediaPipe Tasks Vision] : ", error);
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
            return;
        }
    }

    private processResults(mask: MPMask): void {
        if (this.closed) {
            mask.close();
            return;
        }

        const { width, height } = this.outputCanvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            mask.close();
            console.warn(
                `[MediaPipe Tasks Vision] Skipping frame processing: canvas dimensions are ${width}x${height}`
            );
            return;
        }

        if (this.config.mode === "blur") {
            this.processBlurMode(mask);
        } else if (this.config.mode === "image" || this.config.mode === "video") {
            this.processReplaceMode(mask);
        } else {
            mask.close();
            throw new Error(`[MediaPipe Tasks Vision] Unknown mode: ${this.config.mode}`);
        }

        // Clean up mask resources
        mask.close();

        // Copy from WebGL canvas to output canvas for stream capture
        this.outputCtx.drawImage(this.glCanvas, 0, 0, width, height);

        // Ensure WebGL operations are flushed for captureStream
        if (this.gl) {
            this.gl.flush();
        }

        this.frameCount++;
    }

    private processBlurMode(mask: MPMask): void {
        const { width, height } = this.outputCanvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0 || !this.drawingUtils) {
            return;
        }

        // For blur mode, we create a blurred version of the input on a 2D canvas
        // then use DrawingUtils to composite: blurred background + sharp person
        if (!this.blurredCanvas || !this.blurredCtx) {
            this.initializeBlurredCanvas();
        }
        if (!this.foregroundCanvas || !this.foregroundCtx) {
            this.initializeForegroundCanvas();
        }

        // Ensure canvas dimensions match
        if (this.blurredCanvas!.width !== width || this.blurredCanvas!.height !== height) {
            this.blurredCanvas!.width = width;
            this.blurredCanvas!.height = height;
        }
        if (this.foregroundCanvas!.width !== width || this.foregroundCanvas!.height !== height) {
            this.foregroundCanvas!.width = width;
            this.foregroundCanvas!.height = height;
        }

        // Draw blurred background onto the blurred canvas (using CSS filter)
        this.blurredCtx!.filter = `blur(${this.config.blurAmount || 15}px)`;
        this.blurredCtx!.drawImage(this.inputVideo, 0, 0, width, height);
        this.blurredCtx!.filter = "none";

        // Draw current video frame to foreground canvas (HTMLCanvasElement is faster than HTMLVideoElement)
        this.foregroundCtx!.drawImage(this.inputVideo, 0, 0, width, height);

        // Use DrawingUtils to composite:
        // - defaultTexture (low confidence = background) = blurred canvas
        // - overlayTexture (high confidence = person) = foreground canvas
        // Using HTMLCanvasElement instead of HTMLVideoElement avoids GPU texture re-upload
        this.drawingUtils.drawConfidenceMask(
            mask,
            this.blurredCanvas!, // Background: blurred video
            this.foregroundCanvas! // Foreground: sharp person (canvas for better perf)
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
                this.foregroundCanvas! // Foreground: sharp person (canvas for better perf)
            );
        } else {
            // Fallback: solid black background
            this.drawingUtils.drawConfidenceMask(
                mask,
                [0, 0, 0, 255], // Black background
                this.foregroundCanvas!
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

    private drawBackground(): void {
        const { width, height } = this.outputCanvas;

        switch (this.config.mode) {
            case "image":
                if (this.backgroundImage) {
                    // Scale image to fit canvas while maintaining aspect ratio
                    const scale = Math.max(width / this.backgroundImage.width, height / this.backgroundImage.height);
                    const scaledWidth = this.backgroundImage.width * scale;
                    const scaledHeight = this.backgroundImage.height * scale;
                    const x = (width - scaledWidth) / 2;
                    const y = (height - scaledHeight) / 2;

                    this.outputCtx.drawImage(this.backgroundImage, x, y, scaledWidth, scaledHeight);
                }
                break;

            case "video":
                if (this.backgroundVideo) {
                    this.outputCtx.drawImage(this.backgroundVideo, 0, 0, width, height);
                }
                break;

            default:
                // Solid color fallback
                this.outputCtx.fillStyle = "#000000";
                this.outputCtx.fillRect(0, 0, width, height);
        }
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
        };
    }

    public stop(): void {
        // Stop timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
    }

    public close(): void {
        this.closed = true;

        // Stop timeout
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        // Stop output stream
        if (this.outputStream) {
            this.outputStream.getVideoTracks().forEach((track) => track.stop());
            this.outputStream = null;
        }

        // Close DrawingUtils (frees WebGL resources)
        if (this.drawingUtils) {
            try {
                this.drawingUtils.close();
            } catch (error) {
                console.warn("[MediaPipe Tasks Vision] Error closing DrawingUtils:", error);
            }
            this.drawingUtils = null;
        }

        // Close MediaPipe
        if (this.imageSegmenter) {
            try {
                this.imageSegmenter.close();
            } catch (error) {
                console.warn("[MediaPipe Tasks Vision] Error closing segmenter:", error);
            }
            this.imageSegmenter = null;
        }

        this.gl = null;

        // Clean up resources
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = "";
            this.backgroundVideo = null;
        }
        this.backgroundImage = null;

        // Clean up blurred canvas
        this.blurredCanvas = null;
        this.blurredCtx = null;

        // Clean up background canvas
        this.backgroundCanvas = null;
        this.backgroundCanvasCtx = null;

        // Clean up foreground canvas
        this.foregroundCanvas = null;
        this.foregroundCtx = null;
    }

    public async transform(inputStream: MediaStream): Promise<MediaStream> {
        this.frameRate = inputStream.getVideoTracks()[0]?.getSettings().frameRate || 33;
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.config.mode === "none") {
            return inputStream;
        }

        // Setup input video
        this.inputVideo.srcObject = inputStream;

        // Wait for video metadata to be loaded
        await new Promise<void>((resolve) => {
            if (this.inputVideo.readyState >= 2) {
                // HAVE_CURRENT_DATA
                resolve();
            } else {
                this.inputVideo.addEventListener("loadedmetadata", () => resolve(), { once: true });
            }
        });

        await this.inputVideo.play();

        // Setup canvas dimensions
        const videoWidth = this.inputVideo.videoWidth;
        const videoHeight = this.inputVideo.videoHeight;

        // Check for invalid dimensions (0x0 or undefined)
        if (!videoWidth || !videoHeight || videoWidth === 0 || videoHeight === 0) {
            const errorMessage = `[MediaPipe Tasks Vision] Invalid video dimensions: ${videoWidth}x${videoHeight}. Cannot process stream with 0x0 size.`;
            throw new Error(errorMessage);
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

        // Create output stream from the 2D output canvas
        this.outputStream = this.outputCanvas.captureStream(this.frameRate);

        // Copy audio tracks from the original stream
        for (const audioTrack of inputStream.getAudioTracks()) {
            this.outputStream.addTrack(audioTrack);
        }

        // Don't reset timestamp - keep it monotonic across stream changes
        // MediaPipe requires strictly increasing timestamps, so we use a global timestamp
        // that never resets

        // Stop any existing processing loop before starting a new one
        // This prevents race conditions when transform() is called multiple times
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        // Start processing loop
        this.processFrame();

        return this.outputStream;
    }
}
