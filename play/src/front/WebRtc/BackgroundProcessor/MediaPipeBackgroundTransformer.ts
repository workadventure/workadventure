import { SelfieSegmentation, SelfieSegmentationResults } from "@mediapipe/selfie_segmentation";
import { BackgroundTransformer } from "./createBackgroundTransformer";

/**
 * MediaPipe-based background transformer for video streams
 * Uses a simpler approach with requestAnimationFrame for better reliability
 */
export class MediaPipeBackgroundTransformer implements BackgroundTransformer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private selfieSegmentation: SelfieSegmentation | null = null;
    private isInitialized = false;
    private backgroundImage: HTMLImageElement | null = null;
    private backgroundVideo: HTMLVideoElement | null = null;
    private outputStream: MediaStream | null = null;
    private inputVideo: HTMLVideoElement;
    private animationFrameId: number | null = null;
    private closed = false;
    private frameCount = 0;
    private startTime = performance.now();
    private initPromise: Promise<void>;
    // Reusable temporary canvas to avoid WebGL context leaks
    private tempCanvas: HTMLCanvasElement | null = null;
    private tempCtx: CanvasRenderingContext2D | null = null;

    constructor(
        private config: {
            mode: "none" | "blur" | "image" | "video";
            blurAmount?: number;
            backgroundImage?: string;
            backgroundVideo?: string;
        },
        private perfConfig: {
            targetFPS?: number;
            highQuality?: boolean;
        } = {}
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
            this.initializeMediaPipe();
            await this.loadBackgroundResources();
            // Initialize reusable temporary canvas for compositing
            this.initializeTempCanvas();
            this.isInitialized = true;
        } catch (error) {
            console.error("[MediaPipe] Initialization failed:", error);
            throw error;
        }
    }

    private initializeTempCanvas(): void {
        this.tempCanvas = document.createElement("canvas");
        this.tempCtx = this.tempCanvas.getContext("2d")!;
    }

    private initializeMediaPipe(): void {
        this.selfieSegmentation = new SelfieSegmentation({
            locateFile: (file: string) => `./mediapipe/${file}`,
        });

        this.selfieSegmentation.setOptions({
            modelSelection: 1, // Landscape model for better quality
            selfieMode: true,
        });

        this.selfieSegmentation.onResults((results: SelfieSegmentationResults) => {
            this.processResults(results);
        });
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

    private processResults(results: SelfieSegmentationResults): void {
        if (this.closed || !results.segmentationMask) {
            return;
        }

        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        if (this.config.mode === "blur") {
            this.processBlurMode(results);
        } else if (this.config.mode === "image" || this.config.mode === "video") {
            this.processReplaceMode(results);
        } else {
            // No effect - draw original
            this.ctx.drawImage(results.image, 0, 0, width, height);
        }

        this.frameCount++;
    }

    private processBlurMode(results: SelfieSegmentationResults): void {
        const { width, height } = this.canvas;

        // Step 1: Draw the entire image with blur as background
        this.ctx.filter = `blur(${this.config.blurAmount || 15}px)`;
        this.ctx.drawImage(results.image, 0, 0, width, height);
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
        this.tempCtx!.drawImage(results.image, 0, 0, width, height);

        // Apply segmentation mask to keep only the person
        this.tempCtx!.globalCompositeOperation = "destination-in";
        this.tempCtx!.drawImage(results.segmentationMask, 0, 0, width, height);

        // Step 3: Draw the sharp person on top of the blurred background
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.drawImage(this.tempCanvas!, 0, 0);
    }

    private processReplaceMode(results: SelfieSegmentationResults): void {
        const { width, height } = this.canvas;

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
        this.tempCtx!.drawImage(results.image, 0, 0, width, height);

        // Apply mask to keep only the person
        this.tempCtx!.globalCompositeOperation = "destination-in";
        this.tempCtx!.drawImage(results.segmentationMask, 0, 0, width, height);

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
        // Stop animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    public close(): void {
        this.closed = true;

        // Stop animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Stop output stream
        if (this.outputStream) {
            this.outputStream.getTracks().forEach((track) => track.stop());
            this.outputStream = null;
        }

        // Stop input video
        if (this.inputVideo.srcObject) {
            (this.inputVideo.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
        }

        // Close MediaPipe
        if (this.selfieSegmentation) {
            try {
                this.selfieSegmentation.close();
            } catch (error) {
                console.warn("[MediaPipe] Error closing segmentation:", error);
            }
            this.selfieSegmentation = null as unknown as SelfieSegmentation;
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
    }

    public async transform(inputStream: MediaStream): Promise<MediaStream> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (this.config.mode === "none") {
            return inputStream;
        }

        // Setup input video
        this.inputVideo.srcObject = inputStream;
        await this.inputVideo.play();

        // Setup canvas dimensions
        this.canvas.width = this.inputVideo.videoWidth;
        this.canvas.height = this.inputVideo.videoHeight;

        // Create output stream
        this.outputStream = this.canvas.captureStream(30); // 30 FPS

        // Copy audio tracks from original stream
        inputStream.getAudioTracks().forEach((track) => {
            this.outputStream!.addTrack(track);
        });

        // Start processing loop
        this.startProcessing();

        return this.outputStream;
    }

    private startProcessing(): void {
        const processFrame = () => {
            if (this.closed || !this.outputStream || this.config.mode === "none") {
                return;
            }

            if (this.inputVideo.readyState >= 2 && this.selfieSegmentation) {
                // HAVE_CURRENT_DATA
                this.selfieSegmentation
                    .send({ image: this.inputVideo })
                    .then(() => {
                        this.animationFrameId = requestAnimationFrame(processFrame);
                    })
                    .catch((error) => {
                        console.warn("[MediaPipe] Segmentation error:", error);
                    });
            }
        };

        processFrame();
    }
}
