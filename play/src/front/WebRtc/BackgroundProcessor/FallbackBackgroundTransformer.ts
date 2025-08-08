import type { BackgroundConfig } from './SimplifiedBackgroundTransformer';

/**
 * Fallback transformer that doesn't transform anything
 * Used when MediaStreamTrackProcessor is not available or fails
 */
export class FallbackBackgroundTransformer {
    private outputTrack: MediaStreamTrack;

    constructor(private inputTrack: MediaStreamTrack) {
        this.outputTrack = inputTrack;
        console.log('[FallbackBackgroundTransformer] Created no-op transformer');
    }

    public get track(): MediaStreamTrack {
        return this.outputTrack;
    }

    public async waitForInitialization(): Promise<void> {
        // No initialization needed for fallback
        return Promise.resolve();
    }

    public async updateConfig(config: Partial<BackgroundConfig>): Promise<void> {
        console.log('[FallbackBackgroundTransformer] Config update ignored (no-op transformer)');
    }

    public async transform(inputStream: MediaStream): Promise<MediaStream> {
        // For FallbackBackgroundTransformer, we return the original stream unchanged
        return inputStream;
    }

    public getPerformanceStats() {
        return {
            mode: 'none',
            engine: 'fallback',
            fps: 0,
            frameCount: 0,
            closed: false
        };
    }

    public close(): void {
        console.log('[FallbackBackgroundTransformer] Closing (no-op)');
        // Don't stop the input track as it might be used elsewhere
    }
}
