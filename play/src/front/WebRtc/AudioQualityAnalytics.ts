import { analyticsClient } from "../Administration/AnalyticsClient";

/**
 * Reception quality of the voices we hear, as the admin sees it: one `media.audio_quality.sample` per transport per
 * minute, aggregated over every remote microphone, rather than one event per peer. It is the other half of "the sound
 * is bad" next to the noise suppression events: what the network did to the audio, not what the sender's microphone
 * sounded like.
 */

const AUDIO_QUALITY_SAMPLE_INTERVAL_MS = 60_000;

export type AudioTransport = "P2P" | "SFU";

/** The cumulative `inbound-rtp` audio counters of one report, summed over its audio streams. */
export interface AudioReceiveTotals {
    streams: number;
    totalSamplesReceived: number;
    concealedSamples: number;
    silentConcealedSamples: number;
    concealmentEvents: number;
    packetsReceived: number;
    packetsLost: number;
    jitterBufferDelay: number;
    jitterBufferEmittedCount: number;
    maxJitter: number;
}

export interface AudioQualitySample {
    transportType: AudioTransport;
    windowSeconds: number;
    streams: number;
    concealedRatio: number;
    concealmentEvents: number;
    packetLossRatio: number;
    maxJitterMs: number;
    jitterBufferDelayMs: number | null;
}

interface AudioStatsSource {
    transport: AudioTransport;
    getReport: () => Promise<RTCStatsReport | undefined>;
    previous: AudioReceiveTotals | undefined;
}

const sources = new Set<AudioStatsSource>();
let timer: ReturnType<typeof setInterval> | undefined;

/**
 * Registers a connection whose received audio should be measured. Returns the function that unregisters it; the
 * minute during which it goes away is not reported for it.
 */
export function registerAudioQualitySource(
    transport: AudioTransport,
    getReport: () => Promise<RTCStatsReport | undefined>,
): () => void {
    const source: AudioStatsSource = { transport, getReport, previous: undefined };
    sources.add(source);
    timer ??= setInterval(() => {
        sampleAll().catch((e) => console.error("Audio quality sampling failed", e));
    }, AUDIO_QUALITY_SAMPLE_INTERVAL_MS);

    return () => {
        sources.delete(source);
        if (sources.size === 0 && timer !== undefined) {
            clearInterval(timer);
            timer = undefined;
        }
    };
}

async function sampleAll(): Promise<void> {
    const deltas = new Map<AudioTransport, AudioReceiveTotals>();
    await Promise.all(
        [...sources].map(async (source) => {
            const report = await source.getReport().catch(() => undefined);
            if (!report || !sources.has(source)) {
                return;
            }
            const current = readAudioReceiveTotals(report);
            // The first minute of a source only sets its baseline: its counters started before we looked. So does a
            // minute in which a stream went away or restarted its counters (a replaced LiveKit track, a new P2P
            // SSRC): subtracting across that would give negative, meaningless deltas.
            if (source.previous && !countersRestarted(current, source.previous)) {
                const delta = subtractTotals(current, source.previous);
                const sum = deltas.get(source.transport);
                deltas.set(source.transport, sum ? addTotals(sum, delta) : delta);
            }
            source.previous = current;
        }),
    );

    for (const [transport, delta] of deltas) {
        const sample = toAudioQualitySample(transport, delta, AUDIO_QUALITY_SAMPLE_INTERVAL_MS / 1000);
        if (sample) {
            analyticsClient.trackAdminEvent("media.audio_quality.sample", sample);
        }
    }
}

export function readAudioReceiveTotals(report: RTCStatsReport): AudioReceiveTotals {
    const totals = emptyTotals();
    report.forEach((stat: Record<string, unknown>) => {
        if (stat.type !== "inbound-rtp" || stat.kind !== "audio") {
            return;
        }
        const n = (key: string) => (typeof stat[key] === "number" ? stat[key] : 0);
        totals.streams += 1;
        totals.totalSamplesReceived += n("totalSamplesReceived");
        totals.concealedSamples += n("concealedSamples");
        totals.silentConcealedSamples += n("silentConcealedSamples");
        totals.concealmentEvents += n("concealmentEvents");
        totals.packetsReceived += n("packetsReceived");
        totals.packetsLost += n("packetsLost");
        totals.jitterBufferDelay += n("jitterBufferDelay");
        totals.jitterBufferEmittedCount += n("jitterBufferEmittedCount");
        totals.maxJitter = Math.max(totals.maxJitter, n("jitter"));
    });
    return totals;
}

/**
 * Turns one window of counters into the event, or nothing when no audio was received (everyone muted, or a peer
 * that only sends video).
 */
export function toAudioQualitySample(
    transportType: AudioTransport,
    delta: AudioReceiveTotals,
    windowSeconds: number,
): AudioQualitySample | undefined {
    if (delta.totalSamplesReceived <= 0) {
        return undefined;
    }
    // Silent concealment is Opus DTX filling the pauses of a speaker: expected, not a glitch anyone hears
    const audibleConcealed = Math.max(0, delta.concealedSamples - delta.silentConcealedSamples);
    const packetsExpected = delta.packetsReceived + delta.packetsLost;
    return {
        transportType,
        windowSeconds,
        streams: delta.streams,
        concealedRatio: round(audibleConcealed / delta.totalSamplesReceived),
        concealmentEvents: delta.concealmentEvents,
        packetLossRatio: packetsExpected > 0 ? round(Math.max(0, delta.packetsLost) / packetsExpected) : 0,
        maxJitterMs: Math.round(delta.maxJitter * 1000),
        jitterBufferDelayMs:
            delta.jitterBufferEmittedCount > 0
                ? Math.round((delta.jitterBufferDelay / delta.jitterBufferEmittedCount) * 1000)
                : null,
    };
}

function countersRestarted(current: AudioReceiveTotals, previous: AudioReceiveTotals): boolean {
    return (
        current.streams < previous.streams ||
        current.totalSamplesReceived < previous.totalSamplesReceived ||
        current.concealedSamples < previous.concealedSamples ||
        current.silentConcealedSamples < previous.silentConcealedSamples ||
        current.concealmentEvents < previous.concealmentEvents ||
        current.packetsReceived < previous.packetsReceived ||
        current.packetsLost < previous.packetsLost ||
        current.jitterBufferDelay < previous.jitterBufferDelay ||
        current.jitterBufferEmittedCount < previous.jitterBufferEmittedCount
    );
}

function subtractTotals(current: AudioReceiveTotals, previous: AudioReceiveTotals): AudioReceiveTotals {
    return {
        streams: current.streams,
        totalSamplesReceived: current.totalSamplesReceived - previous.totalSamplesReceived,
        concealedSamples: current.concealedSamples - previous.concealedSamples,
        silentConcealedSamples: current.silentConcealedSamples - previous.silentConcealedSamples,
        concealmentEvents: current.concealmentEvents - previous.concealmentEvents,
        packetsReceived: current.packetsReceived - previous.packetsReceived,
        packetsLost: current.packetsLost - previous.packetsLost,
        jitterBufferDelay: current.jitterBufferDelay - previous.jitterBufferDelay,
        jitterBufferEmittedCount: current.jitterBufferEmittedCount - previous.jitterBufferEmittedCount,
        // Jitter is an instantaneous estimate, not a counter
        maxJitter: current.maxJitter,
    };
}

function addTotals(a: AudioReceiveTotals, b: AudioReceiveTotals): AudioReceiveTotals {
    return {
        streams: a.streams + b.streams,
        totalSamplesReceived: a.totalSamplesReceived + b.totalSamplesReceived,
        concealedSamples: a.concealedSamples + b.concealedSamples,
        silentConcealedSamples: a.silentConcealedSamples + b.silentConcealedSamples,
        concealmentEvents: a.concealmentEvents + b.concealmentEvents,
        packetsReceived: a.packetsReceived + b.packetsReceived,
        packetsLost: a.packetsLost + b.packetsLost,
        jitterBufferDelay: a.jitterBufferDelay + b.jitterBufferDelay,
        jitterBufferEmittedCount: a.jitterBufferEmittedCount + b.jitterBufferEmittedCount,
        maxJitter: Math.max(a.maxJitter, b.maxJitter),
    };
}

function emptyTotals(): AudioReceiveTotals {
    return {
        streams: 0,
        totalSamplesReceived: 0,
        concealedSamples: 0,
        silentConcealedSamples: 0,
        concealmentEvents: 0,
        packetsReceived: 0,
        packetsLost: 0,
        jitterBufferDelay: 0,
        jitterBufferEmittedCount: 0,
        maxJitter: 0,
    };
}

function round(value: number): number {
    return Math.round(value * 10_000) / 10_000;
}
