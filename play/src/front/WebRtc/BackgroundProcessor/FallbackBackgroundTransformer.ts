import type { BackgroundConfig, BackgroundTransformer } from "./createBackgroundTransformer";

/**
 * Fallback transformer that doesn't transform anything
 * Used when MediaStreamTrackProcessor is not available or fails
 */
export class FallbackBackgroundTransformer implements BackgroundTransformer {
    private outputTrack: MediaStreamTrack | null = null;
    constructor() {}

    public async waitForInitialization(): Promise<void> {
        // No initialization needed for fallback
        return Promise.resolve();
    }

    public updateConfig(config: Partial<BackgroundConfig>): Promise<void> {
        return Promise.resolve();
    }

    public transform(inputStream: MediaStream): Promise<MediaStream> {
        // For FallbackBackgroundTransformer, we return the original stream unchanged
        this.outputTrack = inputStream.getVideoTracks()[0];
        return Promise.resolve(inputStream);
    }

    public getPerformanceStats() {
        return {
            mode: "none",
            engine: "fallback",
            fps: 0,
            frameCount: 0,
            closed: false,
        };
    }

    public stop(): void {
        // No stopping needed for fallback
    }

    public close(): void {
        // Don't stop the input track as it might be used elsewhere
    }
}
