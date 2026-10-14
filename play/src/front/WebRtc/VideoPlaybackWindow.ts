import type { VideoPlaybackCounters } from "../Components/Video/WebRtcStats";

// A paused stream is counted by the browser when its first frame comes back, which can land a window or two after
// we resumed it: the freezes and pauses reported that soon after a deliberate pause are ours, not the connection's.
const AFTER_DELIBERATE_PAUSE_MS = 10_000;

/**
 * What happened to a received video between two analytics samples: the difference of the browser's cumulative
 * counters. A counter the browser does not expose stays undefined.
 */
export interface VideoPlaybackWindowDeltas {
    windowSeconds: number;
    framesDecoded: number;
    framesDropped?: number;
    freezeCount?: number;
    freezeSeconds?: number;
    pauseCount?: number;
    pauseSeconds?: number;
    interFrameDelaySumSeconds?: number;
    interFrameDelaySquaredSumSeconds?: number;
    decodeSeconds?: number;
    packetsReceived?: number;
    packetsLost?: number;
}

/**
 * Turns the cumulative playback counters of a received stream into per-sample deltas.
 *
 * The first counters only set a baseline, and so does a new stats object or a counter going down (the browser
 * restarted them). While we pause the stream on purpose there is no baseline, and the windows that follow the pause
 * report nothing: the gap we caused would otherwise read as a long stall.
 */
export class VideoPlaybackWindow {
    private baseline: VideoPlaybackCounters | undefined;
    private deliberatePauseSeenAt = Number.NEGATIVE_INFINITY;

    /**
     * Called on every stats report, sampled or not.
     */
    public observe(expectedFps: number | undefined, now: number): void {
        if (expectedFps === 0) {
            this.baseline = undefined;
            this.deliberatePauseSeenAt = now;
        }
    }

    /**
     * Called when a sample is sent: returns what happened since the previous one, and starts the next window.
     */
    public take(counters: VideoPlaybackCounters | undefined, now: number): VideoPlaybackWindowDeltas | undefined {
        const baseline = this.baseline;
        this.baseline = counters;
        if (!counters || !baseline || counters.statsId !== baseline.statsId) {
            return undefined;
        }
        if (now - this.deliberatePauseSeenAt < AFTER_DELIBERATE_PAUSE_MS) {
            return undefined;
        }

        const windowSeconds = (counters.timestampMs - baseline.timestampMs) / 1000;
        const deltas = {
            framesDecoded: counters.framesDecoded - baseline.framesDecoded,
            framesDropped: delta(counters.framesDropped, baseline.framesDropped),
            freezeCount: delta(counters.freezeCount, baseline.freezeCount),
            freezeSeconds: delta(counters.totalFreezesDuration, baseline.totalFreezesDuration),
            pauseCount: delta(counters.pauseCount, baseline.pauseCount),
            pauseSeconds: delta(counters.totalPausesDuration, baseline.totalPausesDuration),
            interFrameDelaySumSeconds: delta(counters.totalInterFrameDelay, baseline.totalInterFrameDelay),
            interFrameDelaySquaredSumSeconds: delta(
                counters.totalSquaredInterFrameDelay,
                baseline.totalSquaredInterFrameDelay,
            ),
            decodeSeconds: delta(counters.totalDecodeTime, baseline.totalDecodeTime),
            packetsReceived: delta(counters.packetsReceived, baseline.packetsReceived),
        };
        // A counter going down means the browser restarted them: this window is not measurable
        if (windowSeconds <= 0 || Object.values(deltas).some((value) => value !== undefined && value < 0)) {
            return undefined;
        }
        const packetsLost = delta(counters.packetsLost, baseline.packetsLost);
        // Except the lost packets: one counted as lost that arrives late is taken back
        return {
            windowSeconds,
            ...deltas,
            packetsLost: packetsLost === undefined ? undefined : Math.max(0, packetsLost),
        };
    }
}

function delta(current: number | undefined, previous: number | undefined): number | undefined {
    return current === undefined || previous === undefined ? undefined : current - previous;
}
