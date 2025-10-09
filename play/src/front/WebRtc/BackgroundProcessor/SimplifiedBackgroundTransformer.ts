import { getTensorFlow } from './utils/TensorFlowLoader';

export type BackgroundMode = "none" | "blur" | "image" | "video";

export interface BackgroundConfig {
    mode: BackgroundMode;
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
}

export interface PerformanceConfig {
    targetFPS?: number;
    segmentationInterval?: number;
    highQuality?: boolean;  // Use higher quality model (ResNet50) at the cost of performance
}

/**
 * Simplified background transformer that loads TensorFlow.js from CDN
 * and provides clear error messages
 */
export class SimplifiedBackgroundTransformer {
    private tf: any;
    private bodyPix: any;
    private model: any;
    private processor: any;
    private generator: any;
    private outputTrack: MediaStreamTrack | null = null;
    private closed = false;
    private config: BackgroundConfig;
    private perfConfig: PerformanceConfig;
    private initialized = false;
    private initializationPromise: Promise<void>;
    
    private canvas: OffscreenCanvas;
    private ctx: OffscreenCanvasRenderingContext2D | null = null;
    
    private frameCount = 0;
    private segmentationSkipCounter = 0;
    private lastSegmentationMask: Float32Array | null = null;
    private processingSegmentation = false;
    
    constructor(private inputTrack: MediaStreamTrack, config: BackgroundConfig, perfConfig?: PerformanceConfig) {
        console.log('[SimplifiedBackgroundTransformer] Creating transformer with config:', config);
        
        this.config = config;
        this.perfConfig = {
            targetFPS: 24,
            segmentationInterval: 3,
            ...perfConfig
        };
        
        if (this.inputTrack.kind !== 'video') {
            throw new Error('Input track must be a video track');
        }
        
        // Check browser support
        if (typeof MediaStreamTrackProcessor === 'undefined' || typeof MediaStreamTrackGenerator === 'undefined') {
            throw new Error('This browser does not support MediaStreamTrackProcessor API. Please use Chrome 94+ or Edge 94+');
        }
        
        try {
            this.processor = new (MediaStreamTrackProcessor as any)({ 
                track: this.inputTrack
            });
            this.generator = new (MediaStreamTrackGenerator as any)({ kind: "video" });
            
            console.log('[SimplifiedBackgroundTransformer] Generator created:', {
                generator: this.generator,
                hasTrack: !!this.generator.track,
                trackType: this.generator.track ? typeof this.generator.track : 'undefined',
                generatorType: typeof this.generator,
                isMediaStreamTrack: this.generator instanceof MediaStreamTrack
            });
            
            // The track might not be immediately available, so we get it from the generator
            // Some browsers expose it as a property, others as a method
            this.outputTrack = this.generator.track || this.generator;
            
            if (!this.outputTrack || typeof this.outputTrack.stop !== 'function') {
                console.error('[SimplifiedBackgroundTransformer] Invalid output track:', {
                    outputTrack: this.outputTrack,
                    hasStop: this.outputTrack ? typeof this.outputTrack.stop : 'no outputTrack',
                    constructor: this.outputTrack ? this.outputTrack.constructor.name : 'no outputTrack'
                });
                throw new Error('Failed to get valid output track from generator');
            }
            
            console.log('[SimplifiedBackgroundTransformer] Output track ready:', {
                id: this.outputTrack.id,
                kind: this.outputTrack.kind,
                label: this.outputTrack.label,
                readyState: this.outputTrack.readyState
            });
        } catch (error) {
            console.error('[SimplifiedBackgroundTransformer] Failed to create processor/generator:', error);
            throw error;
        }
        
        const { width, height } = this.inputTrack.getSettings();
        this.canvas = new OffscreenCanvas(width || 640, height || 480);
        
        // Store initialization promise
        this.initializationPromise = this.init();
    }
    
    public get track(): MediaStreamTrack {
        if (!this.outputTrack) {
            throw new Error('Transformer not properly initialized');
        }
        return this.outputTrack;
    }
    
    /**
     * Wait for initialization to complete
     */
    public async waitForInitialization(): Promise<void> {
        await this.initializationPromise;
    }
    
    private async init() {
        console.log('[SimplifiedBackgroundTransformer] Initializing...');
        try {
            // Load TensorFlow.js and BodyPix
            const { tf, bodyPix } = await getTensorFlow();
            this.tf = tf;
            this.bodyPix = bodyPix;
            
            // Initialize TensorFlow.js
            console.log('[SimplifiedBackgroundTransformer] Setting up TensorFlow.js...');
            await this.tf.setBackend('webgl');
            await this.tf.ready();
            console.log('[SimplifiedBackgroundTransformer] TensorFlow.js ready with backend:', this.tf.getBackend());
            
            // Load model only if needed
            if (this.config.mode !== 'none') {
                console.log('[SimplifiedBackgroundTransformer] Loading BodyPix model...');
                
                // Choose model configuration based on quality preference
                // For better quality, use ResNet50 with lower outputStride
                const modelConfig = this.perfConfig.highQuality ? {
                    architecture: 'ResNet50',    // Better quality than MobileNetV1
                    outputStride: 16,             // Lower = better quality (8 or 16)
                    multiplier: 1.0,              // Higher = better quality
                    quantBytes: 4                 // Higher = better quality (2 or 4)
                } : {
                    architecture: 'MobileNetV1',
                    outputStride: 16,
                    multiplier: 0.75,
                    quantBytes: 2
                };
                
                console.log('[SimplifiedBackgroundTransformer] Using model config:', modelConfig);
                this.model = await this.bodyPix.load(modelConfig);
                console.log('[SimplifiedBackgroundTransformer] Model loaded successfully');
            }
            
            // Initialize Canvas2D context
            this.ctx = this.canvas.getContext('2d', {
                alpha: false,
                desynchronized: true
            });
            
            if (!this.ctx) {
                throw new Error('Failed to get 2D context');
            }
            
            // Mark as initialized
            this.initialized = true;
            
            // Start processing
            console.log('[SimplifiedBackgroundTransformer] Starting frame processing...');
            void this.processFrames();
            
        } catch (error) {
            console.error('[SimplifiedBackgroundTransformer] Initialization failed:', error);
            // Fallback to pass-through mode
            this.config.mode = "none";
            this.initialized = true; // Mark as initialized even in error case
            void this.processFrames();
        }
    }
    
    private async processFrames() {
        // Check if already closed
        if (this.closed) {
            console.log('[SimplifiedBackgroundTransformer] Skipping processFrames - already closed');
            return;
        }
        
        const reader = this.processor.readable.getReader();
        const writer = this.generator.writable.getWriter();
        
        try {
            while (!this.closed) {
                const result = await reader.read();
                if (result.done || !result.value) break;
                
                const frame = result.value;
                await this.processFrame(frame, writer);
            }
        } finally {
            reader.releaseLock();
            writer.releaseLock();
            
            // Only close if not already closed
            if (this.generator && this.generator.writable && !this.closed) {
                try {
                    await this.generator.writable.close();
                } catch (error) {
                    // Ignore if already closed
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (!errorMessage.includes('CLOSED')) {
                        console.warn('[SimplifiedBackgroundTransformer] Error closing writable:', error);
                    }
                }
            }
        }
    }
    
    private async processFrame(frame: VideoFrame, writer: WritableStreamDefaultWriter<VideoFrame>) {
        try {
            // Log first few frames for debugging
            if (this.frameCount < 3) {
                console.log(`[SimplifiedBackgroundTransformer] Processing frame ${this.frameCount} with mode: ${this.config.mode}`);
            }
            
            // Pass-through mode
            if (this.config.mode === 'none' || !this.ctx) {
                const processedFrame = new VideoFrame(frame, {
                    timestamp: frame.timestamp,
                });
                await writer.write(processedFrame);
                processedFrame.close();
                frame.close();
                this.frameCount++;
                return;
            }
            
            // Process segmentation at intervals
            this.segmentationSkipCounter++;
            if (this.segmentationSkipCounter >= this.perfConfig.segmentationInterval! && 
                !this.processingSegmentation && 
                this.model) {
                
                this.segmentationSkipCounter = 0;
                this.processingSegmentation = true;
                
                // Run segmentation asynchronously
                void this.runSegmentation(frame).then(mask => {
                    this.lastSegmentationMask = mask;
                    this.processingSegmentation = false;
                    if (this.frameCount < 3) {
                        console.log('[SimplifiedBackgroundTransformer] Segmentation completed');
                    }
                }).catch(err => {
                    console.warn('[SimplifiedBackgroundTransformer] Segmentation failed:', err);
                    this.processingSegmentation = false;
                });
            }
            
            // Render frame
            await this.renderFrame(frame);
            
            const processedFrame = new VideoFrame(this.canvas, {
                timestamp: frame.timestamp,
            });
            
            await writer.write(processedFrame);
            frame.close();
            processedFrame.close();
            
            this.frameCount++;
            
        } catch (err) {
            console.error('[SimplifiedBackgroundTransformer] Frame processing failed:', err);
            frame.close();
        }
    }
    
    private async runSegmentation(frame: VideoFrame): Promise<Float32Array> {
        if (!this.model) throw new Error('Model not loaded');
        
        try {
            // Create a temporary canvas to draw the video frame
            const tempCanvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) throw new Error('Failed to get 2D context');
            
            tempCtx.drawImage(frame, 0, 0);
            
            // Run BodyPix segmentation
            // Use higher quality settings if highQuality is enabled
            const segmentationConfig = this.perfConfig.highQuality ? {
                flipHorizontal: false,
                internalResolution: 'high',      // 'high' or 'full' for better quality
                segmentationThreshold: 0.5,      // Lower = more detail captured
                maxDetections: 1,
                scoreThreshold: 0.2,             // Lower = better edge detection
                nmsRadius: 20
            } : {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.7,
                maxDetections: 1,
                scoreThreshold: 0.3,
                nmsRadius: 20
            };
            
            const segmentation = await this.model.segmentPerson(tempCanvas, segmentationConfig);
            
            // Convert binary mask to Float32Array
            const maskData = segmentation.data;
            const float32Mask = new Float32Array(maskData.length);
            
            for (let i = 0; i < maskData.length; i++) {
                float32Mask[i] = maskData[i] ? 1.0 : 0.0;
            }
            
            return float32Mask;
        } catch (error) {
            console.warn('[SimplifiedBackgroundTransformer] Segmentation failed:', error);
            // Return a mask that shows everything (fallback)
            return new Float32Array(frame.displayWidth * frame.displayHeight).fill(1.0);
        }
    }
    
    private async renderFrame(frame: VideoFrame) {
        if (!this.ctx) return;
        
        const { width, height } = this.canvas;
        
        // Simple blur implementation
        if (this.config.mode === 'blur' && this.lastSegmentationMask) {
            // Draw blurred background
            this.ctx.filter = `blur(${this.config.blurAmount || 10}px)`;
            this.ctx.drawImage(frame, 0, 0, width, height);
            this.ctx.filter = 'none';
            
            // Create temporary canvas for person
            const tempCanvas = new OffscreenCanvas(width, height);
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) return;
            
            // Draw sharp person
            tempCtx.drawImage(frame, 0, 0, width, height);
            
            // Apply mask with smooth edges
            const imageData = tempCtx.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            
            // Apply feathering for smoother edges
            const featherRadius = this.perfConfig.highQuality ? 3 : 1;
            
            for (let i = 0; i < this.lastSegmentationMask.length; i++) {
                // Get the mask value (0 to 1)
                const maskValue = this.lastSegmentationMask[i];
                
                // Apply a smoother transition
                let alpha: number;
                if (this.perfConfig.highQuality) {
                    // Smooth transition with sigmoid function
                    const steepness = 10;
                    const threshold = 0.5;
                    const sigmoid = 1 / (1 + Math.exp(-steepness * (maskValue - threshold)));
                    alpha = Math.round(sigmoid * 255);
                } else {
                    // Simple threshold
                    alpha = maskValue > 0.5 ? 255 : 0;
                }
                
                pixels[i * 4 + 3] = alpha;
            }
            
            tempCtx.putImageData(imageData, 0, 0);
            
            // Optional: Apply additional edge smoothing
            if (this.perfConfig.highQuality) {
                this.ctx.filter = 'blur(0.5px)';
                this.ctx.drawImage(tempCanvas, 0, 0, width, height);
                this.ctx.filter = 'none';
            } else {
                this.ctx.drawImage(tempCanvas, 0, 0, width, height);
            }
        } else {
            // No effect or no mask yet
            this.ctx.drawImage(frame, 0, 0, width, height);
        }
    }
    
    public async updateConfig(config: Partial<BackgroundConfig>): Promise<void> {
        console.log('[SimplifiedBackgroundTransformer] Updating config:', config);
        
        // Store old mode to detect changes
        const oldMode = this.config.mode;
        
        // Update configuration
        Object.assign(this.config, config);
        
        // Force mask reset for immediate effect
        this.lastSegmentationMask = null;
        this.processingSegmentation = false;
        this.segmentationSkipCounter = 0;
        
        // Reload background resources if needed
        if (config.backgroundImage || config.backgroundVideo) {
            // This part of the original code did not have a loadBackgroundResources method.
            // Assuming it's a placeholder for future implementation or that it's not needed here.
            // For now, we'll just log the change.
            console.log('[SimplifiedBackgroundTransformer] Background resources updated:', config);
        }
        
        // Log mode changes
        if (oldMode !== this.config.mode) {
            console.log('[SimplifiedBackgroundTransformer] Mode changed from', oldMode, 'to', this.config.mode);
        }
    }

    public async transform(inputStream: MediaStream): Promise<MediaStream> {
        // For SimplifiedBackgroundTransformer, we return the original stream
        // since it uses WebRTC Insertable Streams which modify the track directly
        return inputStream;
    }
    
    public getPerformanceStats() {
        return {
            frameCount: this.frameCount,
            hasSegmentation: !!this.lastSegmentationMask
        };
    }
    
    public close() {
        console.log('[SimplifiedBackgroundTransformer] Closing...');
        this.closed = true;
        
        try {
            // Dispose model
            if (this.model && this.model.dispose) {
                this.model.dispose();
            }
            
            // Clean up tracks - check if they exist before stopping
            if (this.inputTrack && typeof this.inputTrack.stop === 'function') {
                this.inputTrack.stop();
            }
            
            if (this.outputTrack && typeof this.outputTrack.stop === 'function') {
                this.outputTrack.stop();
            }
            
            // Close processor and generator streams if they exist
            if (this.processor && this.processor.readable) {
                this.processor.readable.cancel().catch(() => {});
            }
            
            if (this.generator && this.generator.writable) {
                this.generator.writable.close().catch(() => {});
            }
        } catch (error) {
            console.error('[SimplifiedBackgroundTransformer] Error during cleanup:', error);
        }
        
        this.lastSegmentationMask = null;
    }
}
