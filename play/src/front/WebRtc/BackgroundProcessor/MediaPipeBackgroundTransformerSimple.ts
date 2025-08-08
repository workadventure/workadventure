import * as vision from '@mediapipe/tasks-vision';

export type BackgroundMode = "none" | "blur" | "image" | "video";

export interface BackgroundConfig {
    mode: BackgroundMode;
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
}

/**
 * Simplified MediaPipe background transformer that actually works
 */
export class MediaPipeBackgroundTransformerSimple {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private imageSegmenter?: vision.ImageSegmenter;
    private isInitialized = false;
    private backgroundImage: HTMLImageElement | null = null;
    private outputStream: MediaStream | null = null;
    private inputVideo: HTMLVideoElement;
    private animationFrameId: number | null = null;
    private lastSegmentationResult?: vision.ImageSegmenterResult;
    
    constructor(private config: BackgroundConfig = { mode: "none" }) {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d")!;
        this.inputVideo = document.createElement("video");
        this.inputVideo.autoplay = true;
        this.inputVideo.muted = true;
        this.inputVideo.playsInline = true;
        
        console.log("🎬 MediaPipe Simple Background Transformer created");
    }
    
    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            console.log("🔄 Initializing MediaPipe Tasks Vision...");
            
            const fileSet = await vision.FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
            );
            
            this.imageSegmenter = await vision.ImageSegmenter.createFromOptions(fileSet, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
                    delegate: 'CPU' // Force CPU to avoid WebGL issues
                },
                runningMode: 'VIDEO',
                outputCategoryMask: true,
                outputConfidenceMasks: false,
            });
            
            console.log("✅ MediaPipe initialized successfully");
            await this.loadBackgroundAssets();
            this.isInitialized = true;
        } catch (error) {
            console.error("❌ Failed to initialize MediaPipe:", error);
            throw error;
        }
    }
    
    private async loadBackgroundAssets(): Promise<void> {
        if (this.config.mode === "image" && this.config.backgroundImage) {
            this.backgroundImage = new Image();
            this.backgroundImage.crossOrigin = "anonymous";
            await new Promise((resolve, reject) => {
                this.backgroundImage!.onload = resolve;
                this.backgroundImage!.onerror = reject;
                this.backgroundImage!.src = this.config.backgroundImage!;
            });
        }
    }
    
    async transform(inputStream: MediaStream): Promise<MediaStream> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        if (this.config.mode === "none") {
            return inputStream;
        }
        
        // Setup input video
        this.inputVideo.srcObject = inputStream;
        await this.inputVideo.play();
        
        // Wait for video to be ready
        await new Promise(resolve => {
            const checkReady = () => {
                if (this.inputVideo.videoWidth > 0 && this.inputVideo.videoHeight > 0) {
                    resolve(true);
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
        
        // Setup canvas dimensions
        this.canvas.width = this.inputVideo.videoWidth;
        this.canvas.height = this.inputVideo.videoHeight;
        
        // Create output stream
        this.outputStream = this.canvas.captureStream(30);
        
        // Copy audio tracks
        inputStream.getAudioTracks().forEach((track) => {
            this.outputStream!.addTrack(track);
        });
        
        // Start processing
        this.startProcessing();
        
        return this.outputStream;
    }
    
    private startProcessing(): void {
        const processFrame = () => {
            if (this.inputVideo.readyState >= 2 && this.imageSegmenter) {
                try {
                    // Perform segmentation
                    const timestamp = performance.now();
                    const result = this.imageSegmenter.segmentForVideo(this.inputVideo, timestamp);
                    
                    if (result && result.categoryMask) {
                        this.lastSegmentationResult = result;
                        this.drawFrame(result);
                    } else {
                        // No segmentation, draw original
                        this.drawOriginal();
                    }
                } catch (error) {
                    console.warn("Segmentation error:", error);
                    this.drawOriginal();
                }
            }
            
            if (this.outputStream) {
                this.animationFrameId = requestAnimationFrame(processFrame);
            }
        };
        
        processFrame();
    }
    
    private drawFrame(result: vision.ImageSegmenterResult): void {
        const { width, height } = this.canvas;
        
        if (this.config.mode === "blur") {
            this.drawBlurEffect(result);
        } else {
            this.drawOriginal();
        }
        
        // Clean up
        result.close();
    }
    
    private drawBlurEffect(result: vision.ImageSegmenterResult): void {
        const { width, height } = this.canvas;
        
        // Step 1: Draw blurred background
        this.ctx.filter = `blur(${this.config.blurAmount || 15}px)`;
        this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
        this.ctx.filter = "none";
        
        // Step 2: Draw sharp person on top
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d")!;
        
        // Draw sharp video
        tempCtx.drawImage(this.inputVideo, 0, 0, width, height);
        
        // Apply mask - this is the critical part
        if (result.categoryMask) {
            const maskCanvas = document.createElement("canvas");
            maskCanvas.width = width;
            maskCanvas.height = height;
            const maskCtx = maskCanvas.getContext("2d")!;
            
            // Convert mask to canvas
            const imageData = this.maskToImageData(result.categoryMask, width, height);
            if (imageData) {
                maskCtx.putImageData(imageData, 0, 0);
                
                // Apply mask
                tempCtx.globalCompositeOperation = "destination-in";
                tempCtx.drawImage(maskCanvas, 0, 0);
            }
        }
        
        // Draw person on blurred background
        this.ctx.globalCompositeOperation = "source-over";
        this.ctx.drawImage(tempCanvas, 0, 0);
    }
    
    private maskToImageData(mask: vision.MPMask, width: number, height: number): ImageData | null {
        try {
            const data = mask.getAsFloat32Array();
            if (!data) return null;
            
            const imageData = new ImageData(width, height);
            const pixels = imageData.data;
            
            for (let i = 0; i < data.length; i++) {
                const value = data[i] > 0.5 ? 0 : 255; // Invert: person should be opaque
                const idx = i * 4;
                pixels[idx] = 255;     // R
                pixels[idx + 1] = 255; // G
                pixels[idx + 2] = 255; // B
                pixels[idx + 3] = value; // A
            }
            
            return imageData;
        } catch (error) {
            console.warn("Mask conversion error:", error);
            return null;
        }
    }
    
    private drawOriginal(): void {
        const { width, height } = this.canvas;
        this.ctx.drawImage(this.inputVideo, 0, 0, width, height);
    }
    
    updateConfig(newConfig: Partial<BackgroundConfig>): void {
        this.config = { ...this.config, ...newConfig };
        void this.loadBackgroundAssets();
    }
    
    stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        if (this.outputStream) {
            this.outputStream.getTracks().forEach((track) => track.stop());
            this.outputStream = null;
        }
        
        if (this.inputVideo.srcObject) {
            (this.inputVideo.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
        }
    }
    
    dispose(): void {
        this.stop();
        if (this.imageSegmenter) {
            this.imageSegmenter.close();
            this.imageSegmenter = undefined;
        }
    }
    
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasImageSegmenter: !!this.imageSegmenter,
            config: this.config
        };
    }
}