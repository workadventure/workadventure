import type { Readable, Unsubscriber } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";

/**
 * Reception quality of the voices we hear, as the admin sees it: one `media.audio_quality.sample` per transport per
 * minute, aggregated over every remote microphone, rather than one event per peer. It is the other half of "the sound
 * is bad" next to the noise suppression events: what the network did to the audio, not what the sender's microphone
 * sounded like.
 *
 * Only the time a remote microphone is on counts. While it is muted the browser keeps counting samples (silence it
 * invents), and the moment it mutes, its last sound fading out counts as ~0.4 s of invented audio: reported, both
 * would measure how often people mute, not the network. The counters are therefore read every 10 seconds, and a
 * window that saw the microphone off is dropped.
 */

const AUDIO_QUALITY_SAMPLE_INTERVAL_MS = 60_000;
const AUDIO_QUALITY_POLL_INTERVAL_MS = 10_000;
const POLLS_PER_SAMPLE = AUDIO_QUALITY_SAMPLE_INTERVAL_MS / AUDIO_QUALITY_POLL_INTERVAL_MS;

export type AudioTransport = "P2P" | "SFU";

/** The cumulative `inbound-rtp` audio counters of one report, summed over its audio streams. */
export interface AudioReceiveTotals {
    streams: number;
    totalSamplesReceived: number;
    concealedSamples: number;
    silentConcealedSamples: number;
    concealmentEvents: number;
    // Undefined when a stream does not report them (Firefox)
    insertedSamplesForDeceleration: number | undefined;
    removedSamplesForAcceleration: number | undefined;
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
    deceleratedRatio?: number;
    acceleratedRatio?: number;
    packetLossRatio: number;
    maxJitterMs: number;
    jitterBufferDelayMs: number | null;
}

interface AudioStatsSource {
    transport: AudioTransport;
    getReport: () => Promise<RTCStatsReport | undefined>;
    previous: AudioReceiveTotals | undefined;
    microphoneOn: boolean;
    // The microphone was off at some point since `previous` was read
    mutedSincePrevious: boolean;
    // The last window with the microphone on, held back one poll: a mute signalled a little after the audio stopped
    // must still drop the fade-out it caused
    pending: AudioReceiveTotals | undefined;
    unsubscribeMicrophoneState: Unsubscriber;
}

const sources = new Set<AudioStatsSource>();
// What the current minute counted, per transport, and the microphones it came from
const minute = new Map<AudioTransport, { totals: AudioReceiveTotals; sources: Set<AudioStatsSource> }>();
let polls = 0;
let timer: ReturnType<typeof setInterval> | undefined;

/**
 * Registers a connection whose received audio should be measured, with the state of the remote microphone (every
 * window counts when it is unknown). Returns the function that unregisters it.
 */
export function registerAudioQualitySource(
    transport: AudioTransport,
    getReport: () => Promise<RTCStatsReport | undefined>,
    microphoneState?: Readable<boolean>,
): () => void {
    const source: AudioStatsSource = {
        transport,
        getReport,
        previous: undefined,
        microphoneOn: true,
        mutedSincePrevious: false,
        pending: undefined,
        unsubscribeMicrophoneState: () => {},
    };
    source.unsubscribeMicrophoneState =
        microphoneState?.subscribe((on) => {
            source.microphoneOn = on;
            if (!on) {
                source.mutedSincePrevious = true;
            }
        }) ?? (() => {});
    sources.add(source);
    timer ??= setInterval(() => {
        pollAll().catch((e) => console.error("Audio quality sampling failed", e));
    }, AUDIO_QUALITY_POLL_INTERVAL_MS);

    return () => {
        source.unsubscribeMicrophoneState();
        sources.delete(source);
        if (sources.size === 0 && timer !== undefined) {
            clearInterval(timer);
            timer = undefined;
            polls = 0;
            minute.clear();
        }
    };
}

async function pollAll(): Promise<void> {
    await Promise.all(
        [...sources].map(async (source) => {
            const report = await source.getReport().catch(() => undefined);
            if (!report || !sources.has(source)) {
                return;
            }
            const current = readAudioReceiveTotals(report);
            // The first read of a source only sets its baseline: its counters started before we looked. So does a
            // read after a stream went away or restarted its counters (a replaced LiveKit track, a new P2P SSRC):
            // subtracting across that would give negative, meaningless deltas.
            const delta =
                source.previous && !countersRestarted(current, source.previous)
                    ? subtractTotals(current, source.previous)
                    : undefined;
            if (source.mutedSincePrevious) {
                source.pending = undefined;
            } else {
                if (source.pending) {
                    addToMinute(source, source.pending);
                }
                source.pending = delta && delta.totalSamplesReceived > 0 ? delta : undefined;
            }
            source.previous = current;
            source.mutedSincePrevious = !source.microphoneOn;
        }),
    );

    polls += 1;
    if (polls < POLLS_PER_SAMPLE) {
        return;
    }
    polls = 0;
    for (const [transport, { totals, sources: counted }] of minute) {
        const sample = toAudioQualitySample(
            transport,
            { ...totals, streams: counted.size },
            AUDIO_QUALITY_SAMPLE_INTERVAL_MS / 1000,
        );
        if (sample) {
            analyticsClient.trackAdminEvent("media.audio_quality.sample", sample);
        }
    }
    minute.clear();
}

function addToMinute(source: AudioStatsSource, delta: AudioReceiveTotals): void {
    const counted = minute.get(source.transport);
    if (counted) {
        counted.totals = addTotals(counted.totals, delta);
        counted.sources.add(source);
    } else {
        minute.set(source.transport, { totals: delta, sources: new Set([source]) });
    }
}

export function readAudioReceiveTotals(report: RTCStatsReport): AudioReceiveTotals {
    let totals = emptyTotals();
    report.forEach((stat: Record<string, unknown>) => {
        if (stat.type !== "inbound-rtp" || stat.kind !== "audio") {
            return;
        }
        const optional = (key: string) => (typeof stat[key] === "number" ? stat[key] : undefined);
        const n = (key: string) => optional(key) ?? 0;
        totals = addTotals(totals, {
            streams: 1,
            totalSamplesReceived: n("totalSamplesReceived"),
            concealedSamples: n("concealedSamples"),
            silentConcealedSamples: n("silentConcealedSamples"),
            concealmentEvents: n("concealmentEvents"),
            insertedSamplesForDeceleration: optional("insertedSamplesForDeceleration"),
            removedSamplesForAcceleration: optional("removedSamplesForAcceleration"),
            packetsReceived: n("packetsReceived"),
            packetsLost: n("packetsLost"),
            jitterBufferDelay: n("jitterBufferDelay"),
            jitterBufferEmittedCount: n("jitterBufferEmittedCount"),
            maxJitter: n("jitter"),
        });
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
    const shareOfReceived = (samples: number | undefined) =>
        samples === undefined ? undefined : round(samples / delta.totalSamplesReceived);
    return {
        transportType,
        windowSeconds,
        streams: delta.streams,
        concealedRatio: round(audibleConcealed / delta.totalSamplesReceived),
        concealmentEvents: delta.concealmentEvents,
        deceleratedRatio: shareOfReceived(delta.insertedSamplesForDeceleration),
        acceleratedRatio: shareOfReceived(delta.removedSamplesForAcceleration),
        packetLossRatio: packetsExpected > 0 ? round(Math.max(0, delta.packetsLost) / packetsExpected) : 0,
        maxJitterMs: Math.round(delta.maxJitter * 1000),
        jitterBufferDelayMs:
            delta.jitterBufferEmittedCount > 0
                ? Math.round((delta.jitterBufferDelay / delta.jitterBufferEmittedCount) * 1000)
                : null,
    };
}

// packetsLost is left out: it goes down when a packet counted as lost arrives late
function countersRestarted(current: AudioReceiveTotals, previous: AudioReceiveTotals): boolean {
    const decreased = (now: number | undefined, before: number | undefined) =>
        now !== undefined && before !== undefined && now < before;
    return (
        current.streams < previous.streams ||
        current.totalSamplesReceived < previous.totalSamplesReceived ||
        current.concealedSamples < previous.concealedSamples ||
        current.silentConcealedSamples < previous.silentConcealedSamples ||
        current.concealmentEvents < previous.concealmentEvents ||
        decreased(current.insertedSamplesForDeceleration, previous.insertedSamplesForDeceleration) ||
        decreased(current.removedSamplesForAcceleration, previous.removedSamplesForAcceleration) ||
        current.packetsReceived < previous.packetsReceived ||
        current.jitterBufferDelay < previous.jitterBufferDelay ||
        current.jitterBufferEmittedCount < previous.jitterBufferEmittedCount
    );
}

function subtractTotals(current: AudioReceiveTotals, previous: AudioReceiveTotals): AudioReceiveTotals {
    const minus = (now: number | undefined, before: number | undefined) =>
        now === undefined || before === undefined ? undefined : now - before;
    return {
        streams: current.streams,
        totalSamplesReceived: current.totalSamplesReceived - previous.totalSamplesReceived,
        concealedSamples: current.concealedSamples - previous.concealedSamples,
        silentConcealedSamples: current.silentConcealedSamples - previous.silentConcealedSamples,
        concealmentEvents: current.concealmentEvents - previous.concealmentEvents,
        insertedSamplesForDeceleration: minus(
            current.insertedSamplesForDeceleration,
            previous.insertedSamplesForDeceleration,
        ),
        removedSamplesForAcceleration: minus(
            current.removedSamplesForAcceleration,
            previous.removedSamplesForAcceleration,
        ),
        packetsReceived: current.packetsReceived - previous.packetsReceived,
        packetsLost: Math.max(0, current.packetsLost - previous.packetsLost),
        jitterBufferDelay: current.jitterBufferDelay - previous.jitterBufferDelay,
        jitterBufferEmittedCount: current.jitterBufferEmittedCount - previous.jitterBufferEmittedCount,
        // Jitter is an instantaneous estimate, not a counter
        maxJitter: current.maxJitter,
    };
}

function addTotals(a: AudioReceiveTotals, b: AudioReceiveTotals): AudioReceiveTotals {
    const plus = (x: number | undefined, y: number | undefined) =>
        x === undefined || y === undefined ? undefined : x + y;
    return {
        streams: a.streams + b.streams,
        totalSamplesReceived: a.totalSamplesReceived + b.totalSamplesReceived,
        concealedSamples: a.concealedSamples + b.concealedSamples,
        silentConcealedSamples: a.silentConcealedSamples + b.silentConcealedSamples,
        concealmentEvents: a.concealmentEvents + b.concealmentEvents,
        insertedSamplesForDeceleration: plus(a.insertedSamplesForDeceleration, b.insertedSamplesForDeceleration),
        removedSamplesForAcceleration: plus(a.removedSamplesForAcceleration, b.removedSamplesForAcceleration),
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
        insertedSamplesForDeceleration: 0,
        removedSamplesForAcceleration: 0,
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
