/**
 * Interface for background processors following Dependency Inversion Principle
 */
export interface IBackgroundProcessor {
    /**
     * Get the processed output track
     */
    readonly track: MediaStreamTrack;
    
    /**
     * Update the background configuration
     */
    updateConfig(config: Partial<BackgroundConfig>): void;
    
    /**
     * Get performance statistics
     */
    getPerformanceStats(): PerformanceStats;
    
    /**
     * Clean up resources
     */
    close(): void;
}

export interface BackgroundConfig {
    mode: BackgroundMode;
    blurAmount?: number;
    backgroundImage?: string;
    backgroundVideo?: string;
}

export type BackgroundMode = "none" | "blur" | "image" | "video";

export interface PerformanceConfig {
    targetFPS?: number;
    segmentationInterval?: number;
    adaptiveQuality?: boolean;
    maxProcessingTime?: number;
    useWebGL2?: boolean;
}

export interface PerformanceStats {
    frameCount: number;
    avgFrameTimeMs: number;
    currentFPS: number;
    renderingMode: string;
    qualityScale: number;
    hasSegmentation: boolean;
}

/**
 * Interface for segmentation models
 */
export interface ISegmentationModel {
    /**
     * Load the model
     */
    load(): Promise<void>;
    
    /**
     * Run segmentation on a frame
     */
    segment(frame: VideoFrame | OffscreenCanvas): Promise<Float32Array>;
    
    /**
     * Dispose of the model resources
     */
    dispose(): void;
}

/**
 * Interface for renderers
 */
export interface IRenderer {
    /**
     * Initialize the renderer
     */
    initialize(canvas: OffscreenCanvas): Promise<boolean>;
    
    /**
     * Render a frame with the given mask
     */
    render(frame: VideoFrame, mask: Float32Array | null, config: BackgroundConfig): Promise<void>;
    
    /**
     * Update background resources
     */
    updateBackground(config: BackgroundConfig): Promise<void>;
    
    /**
     * Clean up renderer resources
     */
    dispose(): void;
}

/**
 * Interface for performance monitor
 */
export interface IPerformanceMonitor {
    /**
     * Record frame processing time
     */
    recordFrameTime(processingTime: number): void;
    
    /**
     * Get average frame time
     */
    getAverageFrameTime(): number;
    
    /**
     * Get recommended quality scale
     */
    getRecommendedQualityScale(targetTime: number): number;
    
    /**
     * Get current stats
     */
    getStats(): PerformanceStats;
}
