import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { writable } from "svelte/store";

const trackAdminEvent = vi.fn();
vi.mock("../Administration/AnalyticsClient", () => ({ analyticsClient: { trackAdminEvent } }));

const { readAudioReceiveTotals, registerAudioQualitySource, toAudioQualitySample } =
    await import("./AudioQualityAnalytics");

function report(stats: Record<string, unknown>[]): RTCStatsReport {
    return new Map(stats.map((stat, i) => [String(i), stat]));
}

function inboundAudio(values: Record<string, number>): Record<string, unknown> {
    return { type: "inbound-rtp", kind: "audio", ...values };
}

describe("readAudioReceiveTotals", () => {
    it("sums the inbound audio streams only", () => {
        const totals = readAudioReceiveTotals(
            report([
                inboundAudio({ totalSamplesReceived: 100, concealedSamples: 10, jitter: 0.01 }),
                inboundAudio({ totalSamplesReceived: 50, concealedSamples: 5, jitter: 0.03 }),
                { type: "inbound-rtp", kind: "video", totalSamplesReceived: 999 },
                { type: "outbound-rtp", kind: "audio", totalSamplesReceived: 999 },
            ]),
        );
        expect(totals).toMatchObject({ streams: 2, totalSamplesReceived: 150, concealedSamples: 15, maxJitter: 0.03 });
    });

    it("leaves the time stretching unknown when a stream does not report it", () => {
        const totals = readAudioReceiveTotals(
            report([
                inboundAudio({ insertedSamplesForDeceleration: 10, removedSamplesForAcceleration: 20 }),
                inboundAudio({ totalSamplesReceived: 50 }),
            ]),
        );
        expect(totals.insertedSamplesForDeceleration).toBeUndefined();
        expect(totals.removedSamplesForAcceleration).toBeUndefined();
    });
});

describe("toAudioQualitySample", () => {
    const delta = {
        streams: 1,
        totalSamplesReceived: 48_000,
        concealedSamples: 3_000,
        silentConcealedSamples: 2_000,
        concealmentEvents: 4,
        insertedSamplesForDeceleration: 960,
        removedSamplesForAcceleration: 480,
        packetsReceived: 95,
        packetsLost: 5,
        jitterBufferDelay: 2_400,
        jitterBufferEmittedCount: 48_000,
        maxJitter: 0.012,
    };

    it("leaves the DTX silence out of the concealed share", () => {
        expect(toAudioQualitySample("SFU", delta, 60)).toEqual({
            transportType: "SFU",
            windowSeconds: 60,
            streams: 1,
            concealedRatio: 0.0208,
            concealmentEvents: 4,
            deceleratedRatio: 0.02,
            acceleratedRatio: 0.01,
            packetLossRatio: 0.05,
            maxJitterMs: 12,
            jitterBufferDelayMs: 50,
        });
    });

    it("omits the time stretching the browser does not report", () => {
        const sample = toAudioQualitySample(
            "P2P",
            { ...delta, insertedSamplesForDeceleration: undefined, removedSamplesForAcceleration: undefined },
            60,
        );
        expect(sample?.deceleratedRatio).toBeUndefined();
        expect(sample?.acceleratedRatio).toBeUndefined();
    });

    it("reports nothing for a window without received audio", () => {
        expect(toAudioQualitySample("P2P", { ...delta, totalSamplesReceived: 0 }, 60)).toBeUndefined();
    });
});

describe("registerAudioQualitySource", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        trackAdminEvent.mockClear();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    // Cumulative counters growing by 10 s of audio at each read (the sampler reads every 10 s)
    function counters(extra: (read: number) => Record<string, number> = () => ({})) {
        let read = 0;
        return () => {
            read += 1;
            return Promise.resolve(
                report([inboundAudio({ totalSamplesReceived: read * 480_000, concealedSamples: 0, ...extra(read) })]),
            );
        };
    }

    it("uses the first read as a baseline, then reports one event per transport per minute", async () => {
        const unregisterA = registerAudioQualitySource("P2P", counters());
        const unregisterB = registerAudioQualitySource("P2P", counters());

        await vi.advanceTimersByTimeAsync(50_000);
        expect(trackAdminEvent).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(10_000);
        expect(trackAdminEvent).toHaveBeenCalledTimes(1);
        expect(trackAdminEvent).toHaveBeenCalledWith(
            "media.audio_quality.sample",
            expect.objectContaining({ transportType: "P2P", windowSeconds: 60, streams: 2, concealedRatio: 0 }),
        );

        unregisterA();
        unregisterB();
        await vi.advanceTimersByTimeAsync(120_000);
        expect(trackAdminEvent).toHaveBeenCalledTimes(1);
    });

    it("starts a new baseline for a source whose track restarted, without spoiling the others", async () => {
        const steady = registerAudioQualitySource("SFU", counters());
        // Replaced between the 3rd and 4th read: its counters start again from zero
        const restartingTotals = [100_000, 580_000, 1_060_000, 10_000, 490_000, 970_000, 1_450_000];
        let read = 0;
        const restarting = registerAudioQualitySource("SFU", () =>
            Promise.resolve(
                report([inboundAudio({ totalSamplesReceived: restartingTotals[read++] ?? 0, concealedSamples: 0 })]),
            ),
        );

        await vi.advanceTimersByTimeAsync(60_000);

        // Steady: 4 windows counted by the 6th read (each is held back one read). Restarting: the window across the
        // restart is dropped instead of a -1,050,000-sample delta that would cancel the steady one.
        const [, sample] = trackAdminEvent.mock.calls[0] as [string, { streams: number; concealedRatio: number }];
        expect(sample.streams).toBe(2);
        expect(sample.concealedRatio).toBe(0);
        steady();
        restarting();
    });

    it("drops the windows around a mute, including the fade-out before a late signal", async () => {
        const microphone = writable(true);
        // The 3rd window (4th read) holds the ~0.4 s of audio the browser invents as the sender's voice fades out
        const fadingOut = counters((read) => ({ concealedSamples: read >= 4 ? 21_000 : 0 }));
        const unregister = registerAudioQualitySource("P2P", fadingOut, microphone);

        await vi.advanceTimersByTimeAsync(45_000);
        // The mute reaches us after the audio stopped, in the next window
        microphone.set(false);
        await vi.advanceTimersByTimeAsync(10_000);
        microphone.set(true);
        await vi.advanceTimersByTimeAsync(5_000);

        expect(trackAdminEvent).toHaveBeenCalledTimes(1);
        expect(trackAdminEvent).toHaveBeenCalledWith(
            "media.audio_quality.sample",
            expect.objectContaining({ streams: 1, concealedRatio: 0 }),
        );
        unregister();
    });

    it("counts the same fade-out when the microphone stayed on", async () => {
        const unregister = registerAudioQualitySource(
            "P2P",
            counters((read) => ({ concealedSamples: read >= 4 ? 21_000 : 0 })),
            writable(true),
        );

        await vi.advanceTimersByTimeAsync(60_000);

        // 21,000 invented samples over the 4 windows counted (1,920,000 samples)
        expect(trackAdminEvent).toHaveBeenCalledWith(
            "media.audio_quality.sample",
            expect.objectContaining({ concealedRatio: 0.0109 }),
        );
        unregister();
    });

    it("never counts a microphone that stays muted", async () => {
        const unregister = registerAudioQualitySource("SFU", counters(), writable(false));

        await vi.advanceTimersByTimeAsync(120_000);

        expect(trackAdminEvent).not.toHaveBeenCalled();
        unregister();
    });
});
