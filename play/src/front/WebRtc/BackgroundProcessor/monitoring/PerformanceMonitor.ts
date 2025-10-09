import { IPerformanceMonitor, PerformanceStats } from '../interfaces/BackgroundProcessor';

/**
 * Performance monitoring implementation
 * Follows Single Responsibility Principle - only handles performance tracking
 */
export class PerformanceMonitor implements IPerformanceMonitor {
    private frameTimeHistory: number[] = [];
    private frameCount = 0;
    private currentScale = 1.0;
    private renderingMode = 'Unknown';
    private hasSegmentation = false;
    
    private readonly maxHistorySize: number;
    
    constructor(maxHistorySize = 30) {
        this.maxHistorySize = maxHistorySize;
    }
    
    recordFrameTime(processingTime: number): void {
        this.frameTimeHistory.push(processingTime);
        
        // Keep history size limited
        if (this.frameTimeHistory.length > this.maxHistorySize) {
            this.frameTimeHistory.shift();
        }
        
        this.frameCount++;
    }
    
    getAverageFrameTime(): number {
        if (this.frameTimeHistory.length === 0) {
            return 0;
        }
        
        const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
        return sum / this.frameTimeHistory.length;
    }
    
    getRecommendedQualityScale(targetTime: number): number {
        const avgTime = this.getAverageFrameTime();
        
        // No adjustment needed if no data
        if (avgTime === 0) {
            return this.currentScale;
        }
        
        // Calculate adjustment based on performance
        const performanceRatio = avgTime / targetTime;
        
        if (performanceRatio > 1.2) {
            // Too slow, reduce quality
            this.currentScale = Math.max(0.5, this.currentScale - 0.05);
        } else if (performanceRatio < 0.7) {
            // Too fast, can increase quality
            this.currentScale = Math.min(1.0, this.currentScale + 0.02);
        }
        
        return this.currentScale;
    }
    
    getStats(): PerformanceStats {
        const avgFrameTime = this.getAverageFrameTime();
        
        return {
            frameCount: this.frameCount,
            avgFrameTimeMs: avgFrameTime,
            currentFPS: avgFrameTime > 0 ? 1000 / avgFrameTime : 0,
            renderingMode: this.renderingMode,
            qualityScale: this.currentScale,
            hasSegmentation: this.hasSegmentation
        };
    }
    
    // Additional setters for external state
    setRenderingMode(mode: string): void {
        this.renderingMode = mode;
    }
    
    setHasSegmentation(has: boolean): void {
        this.hasSegmentation = has;
    }
    
    setQualityScale(scale: number): void {
        this.currentScale = Math.max(0.5, Math.min(1.0, scale));
    }
    
    reset(): void {
        this.frameTimeHistory = [];
        this.frameCount = 0;
        this.currentScale = 1.0;
    }
}
