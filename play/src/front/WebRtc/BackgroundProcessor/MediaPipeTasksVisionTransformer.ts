import { ImageSegmenter, FilesetResolver, MPMask } from "@mediapipe/tasks-vision";
import { BackgroundTransformer } from "./createBackgroundTransformer";

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
    // Temporary canvas for compositing
    private tempCanvas: HTMLCanvasElement | null = null;
    private tempCtx: CanvasRenderingContext2D | null = null;
    // Mask canvas for alpha channel
    private maskCanvas: HTMLCanvasElement | null = null;
    private maskCtx: CanvasRenderingContext2D | null = null;

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
            // Initialize temporary canvas for compositing
            this.initializeTempCanvas();
            this.initializeMaskCanvas();
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
                runningMode: "VIDEO",
                outputCategoryMask: false,
                outputConfidenceMasks: true,
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
    }

    private initializeTempCanvas(): void {
        this.tempCanvas = document.createElement("canvas");
        this.tempCtx = this.tempCanvas.getContext("2d")!;
    }

    private initializeMaskCanvas(): void {
        this.maskCanvas = document.createElement("canvas");
        this.maskCtx = this.maskCanvas.getContext("2d")!;
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

            if (result.confidenceMasks && result.confidenceMasks.length > 0) {
                // Use the first confidence mask (person segmentation)
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
        if (this.closed || !this.tempCtx) {
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

        try {
            if (this.config.mode === "blur") {
                this.processBlurMode(mask);
            } else if (this.config.mode === "image" || this.config.mode === "video") {
                this.processReplaceMode(mask);
            } else {
                // No effect - draw original
                this.ctx.clearRect(0, 0, width, height);
                this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
            }
        } finally {
            // Always clean up mask
            mask.close();
        }

        this.frameCount++;
    }

    private processBlurMode(mask: MPMask): void {
        const { width, height } = this.canvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            return;
        }

        // Step 1: Draw the entire image with blur as background
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.filter = `blur(${this.config.blurAmount || 15}px)`;
        this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
        this.ctx.filter = "none";

        // Step 2: Use temporary canvas for the person (sharp) with confidence mask
        if (!this.tempCanvas || !this.tempCtx) {
            this.initializeTempCanvas();
        }

        // Ensure canvas dimensions match
        if (this.tempCanvas!.width !== width || this.tempCanvas!.height !== height) {
            this.tempCanvas!.width = width;
            this.tempCanvas!.height = height;
        }

        // Draw the original (sharp) image on temp canvas
        this.tempCtx!.clearRect(0, 0, width, height);
        this.tempCtx!.globalCompositeOperation = "source-over";
        this.tempCtx!.drawImage(this.inputVideo, 0, 0, width, height);

        // Create alpha mask on mask canvas
        if (!this.maskCanvas || !this.maskCtx) {
            this.initializeMaskCanvas();
        }

        if (this.maskCanvas!.width !== width || this.maskCanvas!.height !== height) {
            this.maskCanvas!.width = width;
            this.maskCanvas!.height = height;
        }

        // Apply confidence mask: create alpha mask from confidence values
        const maskData = mask.getAsFloat32Array();
        const maskWidth = mask.width;
        const maskHeight = mask.height;

        // Create ImageData for alpha mask
        const imageData = this.maskCtx!.createImageData(width, height);
        const data = imageData.data;

        // Scale and apply mask (confidence values are 0-1, higher = more confident it's a person)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Map canvas coordinates to mask coordinates
                const maskX = Math.floor((x / width) * maskWidth);
                const maskY = Math.floor((y / height) * maskHeight);
                const maskIndex = maskY * maskWidth + maskX;

                // Get confidence value (0-1, where 1 = person)
                const confidence = maskData[maskIndex] || 0;

                const pixelIndex = (y * width + x) * 4;
                data[pixelIndex] = 255; // R
                data[pixelIndex + 1] = 255; // G
                data[pixelIndex + 2] = 255; // B
                data[pixelIndex + 3] = confidence * 255; // A (confidence as alpha)
            }
        }

        this.maskCtx!.putImageData(imageData, 0, 0);

        // Apply mask to temp canvas using destination-in
        this.tempCtx!.globalCompositeOperation = "destination-in";
        this.tempCtx!.drawImage(this.maskCanvas!, 0, 0);

        // Step 3: Draw the sharp person on top of the blurred background
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.drawImage(this.tempCanvas!, 0, 0);
    }

    private processReplaceMode(mask: MPMask): void {
        const { width, height } = this.canvas;

        // Skip processing if canvas has invalid dimensions
        if (!width || !height || width === 0 || height === 0) {
            return;
        }

        // Step 1: Draw background replacement (image/video)
        this.ctx.clearRect(0, 0, width, height);
        this.drawBackground();

        // Step 2: Use temporary canvas for the person with confidence mask
        if (!this.tempCanvas || !this.tempCtx) {
            this.initializeTempCanvas();
        }

        // Ensure canvas dimensions match
        if (this.tempCanvas!.width !== width || this.tempCanvas!.height !== height) {
            this.tempCanvas!.width = width;
            this.tempCanvas!.height = height;
        }

        // Draw the original image
        this.tempCtx!.clearRect(0, 0, width, height);
        this.tempCtx!.globalCompositeOperation = "source-over";
        this.tempCtx!.drawImage(this.inputVideo, 0, 0, width, height);

        // Create alpha mask on mask canvas
        if (!this.maskCanvas || !this.maskCtx) {
            this.initializeMaskCanvas();
        }

        if (this.maskCanvas!.width !== width || this.maskCanvas!.height !== height) {
            this.maskCanvas!.width = width;
            this.maskCanvas!.height = height;
        }

        // Apply confidence mask: create alpha mask from confidence values
        const maskData = mask.getAsFloat32Array();
        const maskWidth = mask.width;
        const maskHeight = mask.height;

        // Create ImageData for alpha mask
        const imageData = this.maskCtx!.createImageData(width, height);
        const data = imageData.data;

        // Scale and apply mask (confidence values are 0-1, higher = more confident it's a person)
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Map canvas coordinates to mask coordinates
                const maskX = Math.floor((x / width) * maskWidth);
                const maskY = Math.floor((y / height) * maskHeight);
                const maskIndex = maskY * maskWidth + maskX;

                // Get confidence value (0-1, where 1 = person)
                const confidence = maskData[maskIndex] || 0;

                const pixelIndex = (y * width + x) * 4;
                data[pixelIndex] = 255; // R
                data[pixelIndex + 1] = 255; // G
                data[pixelIndex + 2] = 255; // B
                data[pixelIndex + 3] = confidence * 255; // A (confidence as alpha)
            }
        }

        this.maskCtx!.putImageData(imageData, 0, 0);

        // Apply mask to temp canvas using destination-in
        this.tempCtx!.globalCompositeOperation = "destination-in";
        this.tempCtx!.drawImage(this.maskCanvas!, 0, 0);

        // Step 3: Draw the person on the main canvas
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
