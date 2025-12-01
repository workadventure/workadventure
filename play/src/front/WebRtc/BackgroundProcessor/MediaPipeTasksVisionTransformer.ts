import type { MPMask } from "@mediapipe/tasks-vision";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";
import type { BackgroundTransformer } from "./createBackgroundTransformer";

/**
 * MediaPipe Tasks Vision-based background transformer for video streams
 * Uses the modern @mediapipe/tasks-vision API with ImageSegmenter
 */
export class MediaPipeTasksVisionTransformer implements BackgroundTransformer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private imageSegmenter: ImageSegmenter | null = null;
    private filesetResolver: FilesetResolver | null = null;
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
    // Reusable temporary canvas to avoid WebGL context leaks
    private tempCanvas: HTMLCanvasElement | null = null;
    private tempCtx: CanvasRenderingContext2D | null = null;
    // Canvas for mask conversion
    private maskCanvas: HTMLCanvasElement | null = null;
    private maskCtx: CanvasRenderingContext2D | null = null;
    // Debug flag to track mask inversion issues
    // Try inverted first, as some models may use different category numbering
    private maskInverted = true;

    constructor(
        private config: {
            mode: "none" | "blur" | "image" | "video";
            blurAmount?: number;
            backgroundImage?: string;
            backgroundVideo?: string;
        }
    ) {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d", {
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
            // Initialize reusable temporary canvas for compositing
            this.initializeTempCanvas();
            this.initializeMaskCanvas();
            this.isInitialized = true;
        } catch (error) {
            console.error("[MediaPipe Tasks Vision] Initialization failed:", error);
            throw error;
        }
    }

    private async initializeMediaPipe(): Promise<void> {
        try {
            // Use CDN for WASM files
            //TODO : do not use CDN, use local files
            const wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm";
            this.filesetResolver = await FilesetResolver.forVisionTasks(wasmPath);

            // Use selfie segmentation model from CDN
            // Model options: float16/1 (smaller, faster) or float32/1 (more accurate)
            //TODO : do not use CDN, use local files / see if we can use the local model , use for the previous version
            const modelPath =
                "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite";

            this.imageSegmenter = await ImageSegmenter.createFromOptions(this.filesetResolver, {
                baseOptions: {
                    modelAssetPath: modelPath,
                    delegate: "CPU", // Use CPU to avoid GPU-related issues
                },
                runningMode: "VIDEO",
                outputCategoryMask: true,
                outputConfidenceMasks: false,
            });

            console.info("[MediaPipe Tasks Vision] Initialized successfully");
        } catch (error) {
            console.error("[MediaPipe Tasks Vision] Failed to initialize:", error);
            throw error;
        }
    }

    private initializeTempCanvas(): void {
        this.tempCanvas = document.createElement("canvas");
        this.tempCtx = this.tempCanvas.getContext("2d")!;
    }

    private initializeMaskCanvas(): void {
        this.maskCanvas = document.createElement("canvas");
        this.maskCtx = this.maskCanvas.getContext("2d")!;
    }

    /**
     * Convert MPMask to HTMLCanvasElement for compositing
     * categoryMask contains category indices: 0 = background, 1 = foreground (person)
     */
    private maskToCanvas(mask: MPMask, width: number, height: number): HTMLCanvasElement {
        if (!this.maskCanvas || !this.maskCtx) {
            this.initializeMaskCanvas();
        }

        // Ensure mask canvas dimensions match
        if (this.maskCanvas!.width !== width || this.maskCanvas!.height !== height) {
            this.maskCanvas!.width = width;
            this.maskCanvas!.height = height;
        }

        // Get mask data as Uint8Array (category indices: 0 = background, 1 = foreground)
        const maskData = mask.getAsUint8Array();

        // Validate mask dimensions
        if (maskData.length !== width * height) {
            console.error(
                `[MediaPipe Tasks Vision] Mask size mismatch: expected ${width * height}, got ${maskData.length}`
            );
            // Create a fallback mask (all foreground)
            this.maskCtx!.fillStyle = "white";
            this.maskCtx!.fillRect(0, 0, width, height);
            return this.maskCanvas!;
        }

        // Create ImageData from mask
        const imageData = this.maskCtx!.createImageData(width, height);
        const data = imageData.data;

        // Convert category indices to alpha mask
        // For selfie segmentation: Category 0 = background, Category 1 = foreground (person)

        // Convert category indices to alpha mask
        // Selfie segmentation model: Category 0 = background, Category 1 = foreground (person)
        // If maskInverted flag is set, reverse the logic
        for (let i = 0; i < maskData.length; i++) {
            const category = maskData[i];
            // Category 1 = person (foreground) -> alpha 255, Category 0 = background -> alpha 0
            // If inverted, swap: Category 0 = person, Category 1 = background
            let alpha: number;
            if (this.maskInverted) {
                alpha = category === 0 ? 255 : 0; // Inverted: 0 = person, 1 = background
            } else {
                alpha = category === 1 ? 255 : 0; // Normal: 1 = person, 0 = background
            }
            data[i * 4] = 255; // R (white)
            data[i * 4 + 1] = 255; // G (white)
            data[i * 4 + 2] = 255; // B (white)
            data[i * 4 + 3] = alpha; // A (use category as alpha)
        }

        // Put ImageData to canvas
        this.maskCtx!.putImageData(imageData, 0, 0);

        return this.maskCanvas!;
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

        const { width, height } = this.canvas;

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
            // This is critical: MediaPipe requires timestamps to be strictly increasing
            const currentTime = performance.now();
            const timestampMicroseconds = Math.floor((currentTime - this.globalStartTime) * 1000);

            // Segment the current video frame
            const result = this.imageSegmenter.segmentForVideo(this.inputVideo, timestampMicroseconds);

            if (result.categoryMask) {
                this.processResults(result.categoryMask);
            }
            // Silently skip if no mask - this can happen occasionally and is not critical

            // Schedule next frame
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
        } catch (error) {
            // Only log errors that are not timestamp-related (those are handled by MediaPipe internally)
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes("timestamp") && !errorMessage.includes("norm_rect")) {
                console.warn("[MediaPipe Tasks Vision] Segmentation error:", error);
            }
            // Continue processing even if one frame fails
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
            }
            this.timeoutId = setTimeout(() => this.processFrame(), this.frameRate);
        }
    }

    private processResults(mask: MPMask): void {
        if (this.closed) {
            mask.close();
            return;
        }

        const { width, height } = this.canvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            mask.close();
            console.warn(
                `[MediaPipe Tasks Vision] Skipping frame processing: canvas dimensions are ${width}x${height}`
            );
            return;
        }

        // Convert MPMask to canvas
        const segmentationMask = this.maskToCanvas(mask, width, height);
        mask.close(); // Clean up MPMask after conversion

        this.ctx.clearRect(0, 0, width, height);

        if (this.config.mode === "blur") {
            this.processBlurMode(segmentationMask);
        } else if (this.config.mode === "image" || this.config.mode === "video") {
            this.processReplaceMode(segmentationMask);
        } else {
            // No effect - draw original
            this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
        }

        this.frameCount++;
    }

    private processBlurMode(segmentationMask: HTMLCanvasElement): void {
        const { width, height } = this.canvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            return;
        }

        // Step 1: Draw the entire image with blur as background
        this.ctx.filter = `blur(${this.config.blurAmount || 15}px)`;
        this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
        this.ctx.filter = "none";

        // Step 2: Use reusable temporary canvas for the person (sharp)
        if (!this.tempCanvas || !this.tempCtx) {
            this.initializeTempCanvas();
        }

        // Ensure canvas dimensions match
        if (this.tempCanvas!.width !== width || this.tempCanvas!.height !== height) {
            this.tempCanvas!.width = width;
            this.tempCanvas!.height = height;
        }

        // Draw the original (sharp) image on temp canvas
        this.tempCtx!.globalCompositeOperation = "source-over";
        this.tempCtx!.drawImage(this.inputVideo, 0, 0, width, height);

        // Apply segmentation mask to keep only the person
        this.tempCtx!.globalCompositeOperation = "destination-in";
        this.tempCtx!.drawImage(segmentationMask, 0, 0, width, height);

        // Step 3: Draw the sharp person on top of the blurred background
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.drawImage(this.tempCanvas!, 0, 0);
    }

    private processReplaceMode(segmentationMask: HTMLCanvasElement): void {
        const { width, height } = this.canvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            return;
        }

        // Draw background replacement (image/video)
        this.drawBackground();

        // Use reusable temporary canvas for the person
        if (!this.tempCanvas || !this.tempCtx) {
            this.initializeTempCanvas();
        }

        // Ensure canvas dimensions match
        if (this.tempCanvas!.width !== width || this.tempCanvas!.height !== height) {
            this.tempCanvas!.width = width;
            this.tempCanvas!.height = height;
        }

        // Draw the original image
        this.tempCtx!.globalCompositeOperation = "source-over";
        this.tempCtx!.drawImage(this.inputVideo, 0, 0, width, height);

        // Apply mask to keep only the person
        this.tempCtx!.globalCompositeOperation = "destination-in";
        this.tempCtx!.drawImage(segmentationMask, 0, 0, width, height);

        // Draw the person on the main canvas
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.drawImage(this.tempCanvas!, 0, 0);
    }

    private drawBackground(): void {
        const { width, height } = this.canvas;

        switch (this.config.mode) {
            case "image":
                if (this.backgroundImage) {
                    // Scale image to fit canvas while maintaining aspect ratio
                    const scale = Math.max(width / this.backgroundImage.width, height / this.backgroundImage.height);
                    const scaledWidth = this.backgroundImage.width * scale;
                    const scaledHeight = this.backgroundImage.height * scale;
                    const x = (width - scaledWidth) / 2;
                    const y = (height - scaledHeight) / 2;

                    this.ctx.drawImage(this.backgroundImage, x, y, scaledWidth, scaledHeight);
                }
                break;

            case "video":
                if (this.backgroundVideo) {
                    this.ctx.drawImage(this.backgroundVideo, 0, 0, width, height);
                }
                break;

            default:
                // Solid color fallback
                this.ctx.fillStyle = "#000000";
                this.ctx.fillRect(0, 0, width, height);
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

        // Close MediaPipe
        if (this.imageSegmenter) {
            try {
                this.imageSegmenter.close();
            } catch (error) {
                console.warn("[MediaPipe Tasks Vision] Error closing segmenter:", error);
            }
            this.imageSegmenter = null;
        }

        // Clean up resources
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = "";
            this.backgroundVideo = null;
        }
        this.backgroundImage = null;

        // Clean up temporary canvas
        this.tempCanvas = null;
        this.tempCtx = null;
        this.maskCanvas = null;
        this.maskCtx = null;
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

        this.canvas.width = videoWidth;
        this.canvas.height = videoHeight;

        if (this.outputStream) {
            for (const track of this.outputStream.getVideoTracks()) {
                track.stop();
            }
        }

        // Create output stream
        this.outputStream = this.canvas.captureStream(this.frameRate);

        // Copy audio tracks from the original stream
        for (const audioTrack of inputStream.getAudioTracks()) {
            this.outputStream.addTrack(audioTrack);
        }

        // Don't reset timestamp - keep it monotonic across stream changes
        // MediaPipe requires strictly increasing timestamps, so we use a global timestamp
        // that never resets

        // Start processing loop
        this.processFrame();

        return this.outputStream;
    }
}
