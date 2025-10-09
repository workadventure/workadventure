import * as tf from '@tensorflow/tfjs';
import '../../types/webrtc-insertable-streams';
import { 
    IBackgroundProcessor, 
    BackgroundConfig, 
    PerformanceConfig, 
    PerformanceStats,
    ISegmentationModel,
    IRenderer,
    IPerformanceMonitor
} from './interfaces/BackgroundProcessor';
import { BodyPixSegmentationModel } from './models/BodyPixSegmentationModel';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor';
import { RenderingStrategyManager } from './strategies/RenderingStrategyManager';

/**
 * Refactored background transformer following SOLID principles
 * - Single Responsibility: Each class has one responsibility
 * - Open/Closed: Open for extension via interfaces, closed for modification
 * - Liskov Substitution: Components can be replaced with their implementations
 * - Interface Segregation: Small, focused interfaces
 * - Dependency Inversion: Depends on abstractions, not concretions
 */
export class RefactoredBackgroundTransformer implements IBackgroundProcessor {
    private readonly processor: any; // MediaStreamTrackProcessor
    private readonly generator: any; // MediaStreamTrackGenerator
    private readonly outputTrack: MediaStreamTrack;
    private readonly canvas: OffscreenCanvas;
    
    private closed = false;
    private config: BackgroundConfig;
    private perfConfig: PerformanceConfig;
    
    // Dependencies injected via constructor or created with factories
    private segmentationModel: ISegmentationModel;
    private renderingStrategy: RenderingStrategyManager;
    private performanceMonitor: IPerformanceMonitor;
    private renderer: IRenderer | null = null;
    
    // Segmentation state
    private segmentationSkipCounter = 0;
    private lastSegmentationMask: Float32Array | null = null;
    private processingSegmentation = false;
    private lastFrameTime = 0;
    
    constructor(
        private inputTrack: MediaStreamTrack,
        config: BackgroundConfig,
        perfConfig?: PerformanceConfig,
        // Optional dependency injection for testing
        segmentationModel?: ISegmentationModel,
        performanceMonitor?: IPerformanceMonitor,
        renderingStrategy?: RenderingStrategyManager
    ) {
        this.validateInputTrack(inputTrack);
        
        this.config = config;
        this.perfConfig = this.createPerformanceConfig(perfConfig);
        
        // Use injected dependencies or create defaults
        this.segmentationModel = segmentationModel || new BodyPixSegmentationModel();
        this.performanceMonitor = performanceMonitor || new PerformanceMonitor();
        this.renderingStrategy = renderingStrategy || new RenderingStrategyManager();
        
        // Initialize media stream processing
        this.processor = new (MediaStreamTrackProcessor as any)({ 
            track: this.inputTrack
        });
        this.generator = new (MediaStreamTrackGenerator as any)({ kind: "video" });
        this.outputTrack = this.generator.track;
        
        // Create canvas
        const { width, height } = this.inputTrack.getSettings();
        this.canvas = new OffscreenCanvas(width || 640, height || 480);
        
        // Start initialization
        void this.initialize();
    }
    
    private validateInputTrack(track: MediaStreamTrack): void {
        if (track.kind !== 'video') {
            throw new Error('Input track must be a video track');
        }
        
        if (track.readyState !== 'live') {
            throw new Error('Input track must be live');
        }
    }
    
    private createPerformanceConfig(config?: PerformanceConfig): PerformanceConfig {
        return {
            targetFPS: 24,
            segmentationInterval: 3,
            adaptiveQuality: true,
            maxProcessingTime: 25,
            useWebGL2: true,
            ...config
        };
    }
    
    public get track(): MediaStreamTrack {
        return this.outputTrack;
    }
    
    private async initialize(): Promise<void> {
        try {
            // Initialize TensorFlow.js
            await tf.setBackend('webgl');
            await tf.ready();
            
            // Load segmentation model
            await this.segmentationModel.load();
            
            // Initialize renderer
            this.renderer = await this.renderingStrategy.initializeBestRenderer(
                this.canvas,
                this.perfConfig.useWebGL2
            );
            
            // Update renderer mode in performance monitor
            this.performanceMonitor.setRenderingMode(
                this.renderingStrategy.getCurrentRendererType()
            );
            
            // Load background assets
            await this.renderer.updateBackground(this.config);
            
            // Start processing frames
            void this.processFrames();
            
        } catch (error) {
            console.error('Failed to initialize RefactoredBackgroundTransformer:', error);
            // Fallback to passthrough mode
            this.config.mode = "none";
            void this.processFrames();
        }
    }
    
    private async processFrames(): Promise<void> {
        const reader = this.processor.readable.getReader();
        const writer = this.generator.writable.getWriter();
        
        try {
            while (!this.closed) {
                const result = await reader.read();
                if (result.done || !result.value) break;
                
                const frame = result.value;
                await this.processFrame(frame, writer);
            }
        } catch (error) {
            console.error('Error in frame processing loop:', error);
        } finally {
            reader.releaseLock();
            writer.releaseLock();
            await this.generator.writable.close();
        }
    }
    
    private async processFrame(
        frame: VideoFrame, 
        writer: WritableStreamDefaultWriter<VideoFrame>
    ): Promise<void> {
        const startTime = performance.now();
        
        // FPS throttling
        if (!this.shouldProcessFrame(startTime)) {
            frame.close();
            return;
        }
        
        try {
            // Update quality based on performance
            if (this.perfConfig.adaptiveQuality) {
                this.updateQualityScale();
            }
            
            // Process segmentation if needed
            if (this.shouldRunSegmentation()) {
                this.startSegmentation(frame);
            }
            
            // Render frame
            if (this.renderer) {
                await this.renderer.render(frame, this.lastSegmentationMask, this.config);
            }
            
            // Create and write output frame
            const processedFrame = new VideoFrame(this.canvas, {
                timestamp: frame.timestamp,
            });
            
            await writer.write(processedFrame);
            processedFrame.close();
            
            // Update performance metrics
            const processingTime = performance.now() - startTime;
            this.performanceMonitor.recordFrameTime(processingTime);
            this.lastFrameTime = startTime;
            
        } catch (error) {
            console.error('Frame processing failed:', error);
        } finally {
            frame.close();
        }
    }
    
    private shouldProcessFrame(currentTime: number): boolean {
        const timeSinceLastFrame = currentTime - this.lastFrameTime;
        const targetFrameTime = 1000 / this.perfConfig.targetFPS!;
        
        return timeSinceLastFrame >= targetFrameTime;
    }
    
    private shouldRunSegmentation(): boolean {
        this.segmentationSkipCounter++;
        
        return (
            this.segmentationSkipCounter >= this.perfConfig.segmentationInterval! &&
            !this.processingSegmentation &&
            this.config.mode !== "none"
        );
    }
    
    private startSegmentation(frame: VideoFrame): void {
        this.segmentationSkipCounter = 0;
        this.processingSegmentation = true;
        
        // Run segmentation asynchronously
        void this.runSegmentation(frame)
            .then(mask => {
                this.lastSegmentationMask = mask;
                this.performanceMonitor.setHasSegmentation(true);
            })
            .catch(error => {
                console.warn('Segmentation failed:', error);
            })
            .finally(() => {
                this.processingSegmentation = false;
            });
    }
    
    private async runSegmentation(frame: VideoFrame): Promise<Float32Array> {
        const qualityScale = this.performanceMonitor.getRecommendedQualityScale(
            this.perfConfig.maxProcessingTime!
        );
        
        // Scale frame if needed for performance
        let inputCanvas = new OffscreenCanvas(frame.displayWidth, frame.displayHeight);
        const ctx = inputCanvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get 2D context');
        
        if (qualityScale < 1.0) {
            const scaledWidth = Math.round(frame.displayWidth * qualityScale);
            const scaledHeight = Math.round(frame.displayHeight * qualityScale);
            inputCanvas = new OffscreenCanvas(scaledWidth, scaledHeight);
            const scaledCtx = inputCanvas.getContext('2d');
            if (!scaledCtx) throw new Error('Failed to get scaled 2D context');
            
            scaledCtx.drawImage(frame, 0, 0, scaledWidth, scaledHeight);
        } else {
            ctx.drawImage(frame, 0, 0);
        }
        
        // Run segmentation
        const mask = await this.segmentationModel.segment(inputCanvas);
        
        // Upscale mask if needed
        if (qualityScale < 1.0) {
            return this.upscaleMask(mask, frame.displayWidth, frame.displayHeight, qualityScale);
        }
        
        return mask;
    }
    
    private upscaleMask(
        mask: Float32Array, 
        targetWidth: number, 
        targetHeight: number, 
        currentScale: number
    ): Float32Array {
        // Simple bilinear interpolation for mask upscaling
        const scaledWidth = Math.round(targetWidth * currentScale);
        const scaledHeight = Math.round(targetHeight * currentScale);
        const upscaledMask = new Float32Array(targetWidth * targetHeight);
        
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const srcX = x * currentScale;
                const srcY = y * currentScale;
                
                const x0 = Math.floor(srcX);
                const x1 = Math.min(x0 + 1, scaledWidth - 1);
                const y0 = Math.floor(srcY);
                const y1 = Math.min(y0 + 1, scaledHeight - 1);
                
                const fx = srcX - x0;
                const fy = srcY - y0;
                
                const v00 = mask[y0 * scaledWidth + x0];
                const v10 = mask[y0 * scaledWidth + x1];
                const v01 = mask[y1 * scaledWidth + x0];
                const v11 = mask[y1 * scaledWidth + x1];
                
                const v0 = v00 * (1 - fx) + v10 * fx;
                const v1 = v01 * (1 - fx) + v11 * fx;
                
                upscaledMask[y * targetWidth + x] = v0 * (1 - fy) + v1 * fy;
            }
        }
        
        return upscaledMask;
    }
    
    private updateQualityScale(): void {
        const recommendedScale = this.performanceMonitor.getRecommendedQualityScale(
            this.perfConfig.maxProcessingTime!
        );
        this.performanceMonitor.setQualityScale(recommendedScale);
    }
    
    public updateConfig(newConfig: Partial<BackgroundConfig>): void {
        this.config = { ...this.config, ...newConfig };
        
        if (this.renderer) {
            void this.renderer.updateBackground(this.config);
        }
    }
    
    public getPerformanceStats(): PerformanceStats {
        return this.performanceMonitor.getStats();
    }
    
    public close(): void {
        this.closed = true;
        
        // Clean up renderer
        this.renderingStrategy.dispose();
        
        // Clean up model
        this.segmentationModel.dispose();
        
        // Clean up tracks
        this.inputTrack.stop();
        this.outputTrack.stop();
        
        // Reset performance monitor
        this.performanceMonitor.reset();
        
        // Clear references
        this.lastSegmentationMask = null;
    }
}
