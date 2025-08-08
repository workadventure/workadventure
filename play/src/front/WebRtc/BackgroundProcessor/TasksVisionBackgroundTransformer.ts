import * as vision from '@mediapipe/tasks-vision';

/**
 * MediaPipe Tasks Vision Background Transformer
 * Following exact project architecture from track-processors-js
 */
export class TasksVisionBackgroundTransformer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private imageSegmenter: vision.ImageSegmenter | null = null;
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
    
    // WebGL context following project pattern
    private gl: any = null; // Using 'any' to match project pattern
    
    // Segmentation state
    private lastSegmentationTime = 0;
    private segmentationInterval = 33; // ~30fps like original project
    private lastMask: ImageData | null = null;
    private isProcessingSegmentation = false;
    private hasValidMask = false;

    constructor(
        private inputTrack: MediaStreamTrack,
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
        const { width, height } = inputTrack.getSettings();
        const w = width || 640;
        const h = height || 480;
        
        console.log('[TasksVision] Constructor called with config:', config);
        
        // Create canvas following project pattern
        this.canvas = document.createElement("canvas");
        this.canvas.width = w;
        this.canvas.height = h;
        this.ctx = this.canvas.getContext("2d", { 
            alpha: false, 
            desynchronized: true,
            willReadFrequently: false 
        })!;
        
        this.inputVideo = document.createElement("video");
        this.inputVideo.autoplay = true;
        this.inputVideo.muted = true;
        this.inputVideo.playsInline = true;
        
        // Initialize
        this.initPromise = this.initialize();
    }

    private async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Initialize WebGL first (following project pattern)
            await this.initializeWebGL();
            
            // Initialize MediaPipe with proper WebGL context
            await this.initializeImageSegmenter();
            
            await this.loadBackgroundResources();
            this.isInitialized = true;
            console.log('[TasksVision] Initialization complete');
        } catch (error) {
            console.error('[TasksVision] Initialization failed:', error);
            throw error;
        }
    }

    private async initializeWebGL(): Promise<void> {
        try {
            // Use the project's setupWebGL function directly (following project pattern)
            const { setupWebGL } = await import('./webgl/index');
            this.gl = setupWebGL(this.canvas);
            
            if (!this.gl) {
                throw new Error('setupWebGL returned undefined');
            }
            
            console.log('[TasksVision] WebGL initialized using project setupWebGL');
        } catch (importError) {
            console.warn('[TasksVision] Could not import project setupWebGL, creating fallback:', importError);
            
            // Create a fallback WebGL wrapper following project pattern
            this.gl = {
                renderFrame: (frame: any) => {
                    // Simple fallback rendering
                    this.ctx.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
                },
                updateMask: (mask: any) => {
                    // Simple mask update
                    console.log('[TasksVision] Mask updated via fallback wrapper');
                },
                setBlurRadius: (radius: number | null) => {
                    console.log('[TasksVision] Blur radius set to:', radius);
                },
                setBackgroundImage: (image: any) => {
                    console.log('[TasksVision] Background image set');
                },
                cleanup: () => {
                    console.log('[TasksVision] Fallback cleanup');
                }
            };
        }
    }

    private async initializeImageSegmenter(): Promise<void> {
        try {
            console.log('[TasksVision] Initializing MediaPipe ImageSegmenter...');
            
            // Initialize the vision task
            const filesetResolver = await vision.FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
            );

            // Create image segmenter with CPU delegate to avoid WebGL conflicts
            this.imageSegmenter = await vision.ImageSegmenter.createFromOptions(filesetResolver, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
                    delegate: 'CPU' // Use CPU to avoid WebGL conflicts
                },
                runningMode: 'VIDEO',
                outputCategoryMask: true,
                outputConfidenceMasks: false
            });

            console.log('[TasksVision] MediaPipe ImageSegmenter initialized successfully');
            
        } catch (error) {
            console.error('[TasksVision] MediaPipe initialization failed:', error);
            throw error;
        }
    }

    private async loadBackgroundResources(): Promise<void> {
        if (this.config.mode === "image" && this.config.backgroundImage) {
            this.backgroundImage = new Image();
            this.backgroundImage.crossOrigin = "anonymous";
            await new Promise<void>((resolve, reject) => {
                this.backgroundImage!.onload = () => resolve();
                this.backgroundImage!.onerror = () => reject(new Error('Failed to load background image'));
                this.backgroundImage!.src = this.config.backgroundImage!;
            });
            
            // Set background image via WebGL following project pattern
            if (this.gl && this.gl.setBackgroundImage) {
                const imageBitmap = await createImageBitmap(this.backgroundImage);
                this.gl.setBackgroundImage(imageBitmap);
            }
        }

        if (this.config.mode === "video" && this.config.backgroundVideo) {
            this.backgroundVideo = document.createElement("video");
            this.backgroundVideo.crossOrigin = "anonymous";
            this.backgroundVideo.loop = true;
            this.backgroundVideo.muted = true;
            this.backgroundVideo.autoplay = true;
            this.backgroundVideo.playsInline = true;
            this.backgroundVideo.src = this.config.backgroundVideo;
            await this.backgroundVideo.play();
        }
        
        // Set blur radius via WebGL following project pattern
        if (this.gl && this.gl.setBlurRadius) {
            this.gl.setBlurRadius(this.config.blurAmount || null);
        }
    }

    private async processFrame(): Promise<void> {
        if (this.closed || !this.outputStream || !this.imageSegmenter || !this.gl) {
            return;
        }

        if (this.inputVideo.readyState < 2) { // HAVE_CURRENT_DATA
            return;
        }

        try {
            const width = this.canvas.width;
            const height = this.canvas.height;
            
            // Resize canvas if video dimensions changed
            if (this.inputVideo.videoWidth !== width || this.inputVideo.videoHeight !== height) {
                this.canvas.width = this.inputVideo.videoWidth;
                this.canvas.height = this.inputVideo.videoHeight;
            }
            
            // Create VideoFrame from input video following project pattern
            const frame = new VideoFrame(this.inputVideo);
            
            // Perform segmentation following project pattern
            const now = performance.now();
            if (!this.isProcessingSegmentation && (now - this.lastSegmentationTime > this.segmentationInterval)) {
                this.isProcessingSegmentation = true;
                this.lastSegmentationTime = now;
                
                try {
                    // Use segmentForVideo with callback following project pattern
                    const segmentationStartTimeMs = performance.now();
                    this.imageSegmenter!.segmentForVideo(frame, segmentationStartTimeMs, (result) => {
                        try {
                            if (result.categoryMask) {
                                this.updateMask(result.categoryMask);
                                console.log('[TasksVision] Segmentation result received');
                            } else {
                                console.warn('[TasksVision] No category mask in result');
                                this.hasValidMask = false;
                            }
                            result.close();
                        } catch (error) {
                            console.error('[TasksVision] Error processing segmentation result:', error);
                            this.hasValidMask = false;
                        }
                    });
                } catch (error) {
                    console.warn('[TasksVision] Segmentation error:', error);
                    this.hasValidMask = false;
                } finally {
                    this.isProcessingSegmentation = false;
                }
            }
            
            // Always render frame using WebGL following project pattern
            this.drawFrame(frame);
            
            this.frameCount++;
            
            // Close frame to free resources
            frame.close();
        } catch (error) {
            console.warn('[TasksVision] Frame processing error:', error);
        }
    }

    private updateMask(mask: vision.MPMask): void {
        if (!mask || !this.gl) return;
        
        try {
            // Following project pattern: use getAsWebGLTexture if available
            try {
                const webGLTexture = mask.getAsWebGLTexture();
                this.gl.updateMask(webGLTexture);
                this.hasValidMask = true;
                console.log('[TasksVision] Mask updated via WebGL texture');
            } catch (webGLError) {
                console.warn('[TasksVision] WebGL texture not available, using fallback:', webGLError);
                
                // Fallback to ImageData following project pattern
                let maskArray: Float32Array | Uint8Array | null = null;
                try {
                    maskArray = mask.getAsFloat32Array();
                } catch {
                    try {
                        maskArray = mask.getAsUint8Array();
                    } catch {
                        console.warn('[TasksVision] Could not get mask array');
                        this.hasValidMask = false;
                        return;
                    }
                }
                
                if (!maskArray) {
                    this.hasValidMask = false;
                    return;
                }
                
                const width = this.canvas.width;
                const height = this.canvas.height;
                
                // Create ImageData for the mask
                const imageData = new ImageData(width, height);
                const data = imageData.data;
                
                // Convert mask to RGBA format
                for (let i = 0; i < maskArray.length; i++) {
                    const pixelIndex = i * 4;
                    const maskValue = maskArray instanceof Float32Array 
                        ? Math.floor(maskArray[i] * 255) 
                        : maskArray[i];
                    
                    data[pixelIndex] = maskValue;     // R
                    data[pixelIndex + 1] = maskValue; // G
                    data[pixelIndex + 2] = maskValue; // B
                    data[pixelIndex + 3] = 255;       // A
                }
                
                this.lastMask = imageData;
                this.hasValidMask = true;
                console.log('[TasksVision] Mask updated via ImageData, sample values:', {
                    first: data[0],
                    middle: data[Math.floor(data.length / 2)],
                    last: data[data.length - 4]
                });
                
                // For fallback, we can't use WebGL texture, so we'll use a simple approach
                // The project's updateMask expects WebGLTexture, so we'll skip it in fallback mode
                if (this.gl.renderFrame) {
                    // The fallback renderFrame will handle the mask differently
                    console.log('[TasksVision] Using fallback mask handling');
                }
            }
        } catch (error) {
            console.error('[TasksVision] Error updating mask:', error);
            this.hasValidMask = false;
        }
    }

    private drawFrame(frame: VideoFrame): void {
        if (!this.gl) return;
        
        // Use WebGL renderFrame following project pattern
        this.gl.renderFrame(frame);
    }

    public get track(): MediaStreamTrack {
        if (!this.outputStream) {
            throw new Error('Transformer not properly initialized');
        }
        return this.outputStream.getVideoTracks()[0];
    }

    public async waitForInitialization(): Promise<void> {
        await this.initPromise;
    }

    public async updateConfig(config: Partial<typeof this.config>): Promise<void> {
        console.log('[TasksVision] Updating config:', config);
        Object.assign(this.config, config);
        
        // Update blur radius via WebGL following project pattern
        if (this.gl && this.gl.setBlurRadius) {
            this.gl.setBlurRadius(config.blurAmount || null);
        }
        
        if (config.backgroundImage || config.backgroundVideo || config.mode) {
            await this.loadBackgroundResources();
        }
        
        // Force mask update when config changes
        this.hasValidMask = false;
        this.lastSegmentationTime = 0; // Reset timing to force immediate update
        
        console.log('[TasksVision] Config updated:', this.config);
    }
    
    /**
     * Force a mask update to ensure blur is recalculated
     */
    public forceMaskUpdate(): void {
        console.log('[TasksVision] Forcing mask update');
        this.hasValidMask = false;
        this.lastSegmentationTime = 0; // Reset timing to force immediate update
    }

    public async transform(inputStream: MediaStream): Promise<MediaStream> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        console.log('[TasksVision] Transform called with mode:', this.config.mode);

        if (this.config.mode === "none") {
            return inputStream;
        }

        // Setup input video
        this.inputVideo.srcObject = inputStream;
        await this.inputVideo.play();

        // Wait for video to be ready
        await new Promise<void>((resolve) => {
            if (this.inputVideo.videoWidth > 0) {
                resolve();
            } else {
                this.inputVideo.addEventListener('loadedmetadata', () => resolve(), { once: true });
            }
        });

        // Setup canvas dimensions
        const width = this.inputVideo.videoWidth;
        const height = this.inputVideo.videoHeight;
        
        console.log('[TasksVision] Video dimensions:', width, 'x', height);
        
        this.canvas.width = width;
        this.canvas.height = height;

        // Create output stream from canvas
        this.outputStream = this.canvas.captureStream(this.perfConfig.targetFPS || 30);

        // Copy audio tracks from original stream
        inputStream.getAudioTracks().forEach((track) => {
            this.outputStream!.addTrack(track);
        });

        // Start processing loop
        this.startProcessing();

        return this.outputStream;
    }

    private startProcessing(): void {
        const processFrame = async () => {
            if (this.closed || !this.outputStream) {
                return;
            }

            await this.processFrame();
            this.animationFrameId = requestAnimationFrame(processFrame);
        };

        processFrame();
    }

    public getPerformanceStats() {
        const elapsed = performance.now() - this.startTime;
        const fps = this.frameCount > 0 && elapsed > 0 
            ? Math.round((this.frameCount / elapsed) * 1000) 
            : 0;
        
        return {
            fps,
            frameCount: this.frameCount,
            elapsed: Math.round(elapsed),
            closed: this.closed,
            engine: 'tasks-vision-project-pattern',
            mode: this.config.mode,
            hasSegmentation: !!this.lastMask,
            hasValidMask: this.hasValidMask,
            isProcessingSegmentation: this.isProcessingSegmentation,
            segmentationInterval: this.segmentationInterval
        };
    }

    public close(): void {
        console.log('[TasksVision] Closing transformer');
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

        // Close image segmenter following project pattern
        if (this.imageSegmenter) {
            try {
                this.imageSegmenter.close();
            } catch (error) {
                console.warn('[TasksVision] Error closing image segmenter:', error);
            }
            this.imageSegmenter = null;
        }

        // Clean up WebGL following project pattern
        if (this.gl && this.gl.cleanup) {
            this.gl.cleanup();
        }

        // Clean up resources
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo.src = '';
            this.backgroundVideo = null;
        }
        this.backgroundImage = null;
        this.lastMask = null;
    }
}
