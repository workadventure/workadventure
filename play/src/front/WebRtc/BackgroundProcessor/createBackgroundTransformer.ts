import { SimplifiedBackgroundTransformer } from './SimplifiedBackgroundTransformer';
import { FallbackBackgroundTransformer } from './FallbackBackgroundTransformer';
import { MediaPipeBackgroundTransformer } from './MediaPipeBackgroundTransformer';
import { TasksVisionBackgroundTransformer } from './TasksVisionBackgroundTransformer';
import type { BackgroundConfig, PerformanceConfig } from './SimplifiedBackgroundTransformer';

export interface BackgroundTransformer {
    readonly track: MediaStreamTrack;
    updateConfig(config: Partial<BackgroundConfig>): void;
    getPerformanceStats(): any;
    close(): void;
    waitForInitialization?(): Promise<void>;
    transform?(inputStream: MediaStream): Promise<MediaStream>;
}

export interface TransformerOptions extends PerformanceConfig {
    engine?: 'bodypix' | 'mediapipe' | 'tasks-vision';  // Choose the segmentation engine
}

/**
 * Create a background transformer with fallback support
 * 
 * @param videoTrack The video track to transform
 * @param config Background configuration
 * @param options Performance configuration and engine selection
 * @returns A transformer instance (Tasks Vision, MediaPipe, BodyPix or Fallback)
 */
export async function createBackgroundTransformer(
    videoTrack: MediaStreamTrack,
    config: BackgroundConfig,
    options?: TransformerOptions
): Promise<BackgroundTransformer> {
    console.log('[createBackgroundTransformer] Attempting to create transformer...');
    
    // Check if we should even try to create a transformer
    if (config.mode === 'none') {
        console.log('[createBackgroundTransformer] Mode is "none", using fallback');
        return new FallbackBackgroundTransformer(videoTrack);
    }
    
    // Check browser support
    if (typeof MediaStreamTrackProcessor === 'undefined' || typeof MediaStreamTrackGenerator === 'undefined') {
        console.warn('[createBackgroundTransformer] MediaStreamTrackProcessor API not available, using fallback');
        return new FallbackBackgroundTransformer(videoTrack);
    }
    
    try {
        // Choose engine based on options
        const engine = options?.engine || 'tasks-vision'; // Default to Tasks Vision for best quality
        console.log(`[createBackgroundTransformer] Using ${engine} engine`);
        
        let transformer: BackgroundTransformer;
        
        if (engine === 'tasks-vision') {
            transformer = new TasksVisionBackgroundTransformer(videoTrack, config, options);
        } else if (engine === 'mediapipe') {
            transformer = new MediaPipeBackgroundTransformer(videoTrack, config, options);
        } else {
            transformer = new SimplifiedBackgroundTransformer(videoTrack, config, options);
        }
        
        // Wait for initialization to complete
        if (transformer.waitForInitialization) {
            await transformer.waitForInitialization();
        }
        
        console.log(`[createBackgroundTransformer] Successfully created and initialized ${engine} transformer`);
        return transformer;
    } catch (error) {
        console.error('[createBackgroundTransformer] Failed to create transformer:', error);
        console.log('[createBackgroundTransformer] Using fallback transformer');
        return new FallbackBackgroundTransformer(videoTrack);
    }
}
