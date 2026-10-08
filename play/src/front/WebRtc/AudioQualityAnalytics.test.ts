import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
});

describe("toAudioQualitySample", () => {
    const delta = {
        streams: 1,
        totalSamplesReceived: 48_000,
        concealedSamples: 3_000,
        silentConcealedSamples: 2_000,
        concealmentEvents: 4,
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
            packetLossRatio: 0.05,
            maxJitterMs: 12,
            jitterBufferDelayMs: 50,
        });
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

    it("uses the first minute as a baseline, then reports one event per transport", async () => {
        let samples = 0;
        const getReport = () => {
            samples += 48_000;
            return Promise.resolve(report([inboundAudio({ totalSamplesReceived: samples, concealedSamples: 0 })]));
        };
        const unregisterA = registerAudioQualitySource("P2P", getReport);
        const unregisterB = registerAudioQualitySource("P2P", getReport);

        await vi.advanceTimersByTimeAsync(60_000);
        expect(trackAdminEvent).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(60_000);
        expect(trackAdminEvent).toHaveBeenCalledTimes(1);
        expect(trackAdminEvent).toHaveBeenCalledWith(
            "media.audio_quality.sample",
            expect.objectContaining({ transportType: "P2P", streams: 2, concealedRatio: 0 }),
        );

        unregisterA();
        unregisterB();
        await vi.advanceTimersByTimeAsync(120_000);
        expect(trackAdminEvent).toHaveBeenCalledTimes(1);
    });

    it("starts a new baseline for a source whose track restarted, without spoiling the others", async () => {
        let steadyMinute = 0;
        const steady = registerAudioQualitySource("SFU", () =>
            Promise.resolve(
                report([inboundAudio({ totalSamplesReceived: ++steadyMinute * 48_000, concealedSamples: 0 })]),
            ),
        );
        // Replaced between the 2nd and 3rd minute: its counters start again from zero
        const restartingTotals = [100_000, 148_000, 10_000, 58_000];
        let restartingMinute = 0;
        const restarting = registerAudioQualitySource("SFU", () =>
            Promise.resolve(
                report([
                    inboundAudio({
                        totalSamplesReceived: restartingTotals[restartingMinute++] ?? 0,
                        concealedSamples: 0,
                    }),
                ]),
            ),
        );

        await vi.advanceTimersByTimeAsync(4 * 60_000);

        // Minute 1: baselines. Minute 2: both. Minute 3: the steady source alone (the other one takes a new
        // baseline instead of a -138,000-sample delta that would cancel it). Minute 4: both again.
        expect(trackAdminEvent.mock.calls.map(([, sample]) => (sample as { streams: number }).streams)).toEqual([
            2, 1, 2,
        ]);
        steady();
        restarting();
    });
});
