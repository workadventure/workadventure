export const LOUD_ENVIRONMENT_SAMPLE_INTERVAL_MS = 100;
export const LOUD_ENVIRONMENT_RMS_THRESHOLD = 0.001;
export const LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT = 50;
export const LOUD_ENVIRONMENT_REQUIRED_LOUD_SAMPLE_COUNT = 45;
export const LOUD_ENVIRONMENT_COOLDOWN_MS = 60_000;

export interface LoudEnvironmentDetectorOptions {
    threshold?: number;
    windowSampleCount?: number;
    requiredLoudSampleCount?: number;
    cooldownMs?: number;
}

export interface LoudEnvironmentSample {
    rms: number | undefined;
    timestamp: number;
    enabled: boolean;
    contextKey: string | undefined;
}

export class LoudEnvironmentDetector {
    private readonly threshold: number;
    private readonly windowSampleCount: number;
    private readonly requiredLoudSampleCount: number;
    private readonly cooldownMs: number;
    private loudSamples: boolean[] = [];
    private lastContextKey: string | undefined;
    private lastTriggeredAt: number | undefined;

    constructor(options: LoudEnvironmentDetectorOptions = {}) {
        this.threshold = options.threshold ?? LOUD_ENVIRONMENT_RMS_THRESHOLD;
        this.windowSampleCount = options.windowSampleCount ?? LOUD_ENVIRONMENT_WINDOW_SAMPLE_COUNT;
        this.requiredLoudSampleCount = options.requiredLoudSampleCount ?? LOUD_ENVIRONMENT_REQUIRED_LOUD_SAMPLE_COUNT;
        this.cooldownMs = options.cooldownMs ?? LOUD_ENVIRONMENT_COOLDOWN_MS;
    }

    public processSample(sample: LoudEnvironmentSample): boolean {
        if (!sample.enabled || sample.rms === undefined) {
            this.reset();
            return false;
        }

        if (sample.contextKey !== this.lastContextKey) {
            this.reset(sample.contextKey);
        }

        if (this.lastTriggeredAt !== undefined && sample.timestamp - this.lastTriggeredAt < this.cooldownMs) {
            return false;
        }

        this.loudSamples.push(sample.rms >= this.threshold);
        if (this.loudSamples.length > this.windowSampleCount) {
            this.loudSamples.shift();
        }

        const loudSampleCount = this.loudSamples.filter(Boolean).length;
        if (this.loudSamples.length >= this.windowSampleCount && loudSampleCount >= this.requiredLoudSampleCount) {
            this.lastTriggeredAt = sample.timestamp;
            this.loudSamples = [];
            return true;
        }

        return false;
    }

    public reset(contextKey = this.lastContextKey): void {
        this.loudSamples = [];
        this.lastTriggeredAt = undefined;
        this.lastContextKey = contextKey;
    }
}
