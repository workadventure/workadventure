const CHECKPOINT_INTERVAL_MS = 15_000;
const SLOW_SEGMENTATION_MS = 30;
const FAST_SEGMENTATION_MS = 5;
const MIN_INTERVAL = 1;
const MAX_INTERVAL = 4;
export const DEFAULT_RESEGMENT_INTERVAL = 2;

type Recommendation = -1 | 0 | 1;

/**
 * Decides how many frames reuse the last segmentation mask before a new one is computed.
 *
 * Every 15 s the mean segmentation time is checked: above 30 ms it recommends segmenting less often, below 5 ms
 * more often. The interval only moves when the same recommendation shows up at two consecutive checkpoints,
 * so a single busy period does not flip it back and forth.
 */
export class ResegmentController {
    private interval = DEFAULT_RESEGMENT_INTERVAL;
    private segmentMsSum = 0;
    private sampleCount = 0;
    private previousRecommendation: Recommendation = 0;
    private checkpointAtMs: number;

    constructor(nowMs = performance.now()) {
        this.checkpointAtMs = nowMs + CHECKPOINT_INTERVAL_MS;
    }

    public getInterval(): number {
        return this.interval;
    }

    /** Records one segmentation duration; returns the (possibly updated) interval. */
    public tick(segmentMs: number, nowMs = performance.now()): number {
        this.segmentMsSum += segmentMs;
        this.sampleCount++;
        if (nowMs < this.checkpointAtMs) {
            return this.interval;
        }

        const meanMs = this.segmentMsSum / this.sampleCount;
        const recommendation: Recommendation =
            meanMs > SLOW_SEGMENTATION_MS ? 1 : meanMs < FAST_SEGMENTATION_MS ? -1 : 0;
        if (recommendation !== 0 && recommendation === this.previousRecommendation) {
            this.interval = Math.min(MAX_INTERVAL, Math.max(MIN_INTERVAL, this.interval + recommendation));
            this.previousRecommendation = 0;
        } else {
            this.previousRecommendation = recommendation;
        }

        this.segmentMsSum = 0;
        this.sampleCount = 0;
        this.checkpointAtMs = nowMs + CHECKPOINT_INTERVAL_MS;
        return this.interval;
    }
}
