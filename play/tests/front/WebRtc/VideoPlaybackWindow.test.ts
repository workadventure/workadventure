import { describe, expect, it } from "vitest";
import type { VideoPlaybackCounters } from "../../../src/front/Components/Video/WebRtcStats";
import { VideoPlaybackWindow } from "../../../src/front/WebRtc/VideoPlaybackWindow";

function counters(overrides: Partial<VideoPlaybackCounters> = {}): VideoPlaybackCounters {
    return {
        statsId: "IT01V1",
        timestampMs: 10_000,
        framesDecoded: 300,
        framesDropped: 2,
        freezeCount: 1,
        totalFreezesDuration: 0.4,
        pauseCount: 0,
        totalPausesDuration: 0,
        totalInterFrameDelay: 9.9,
        totalSquaredInterFrameDelay: 0.4,
        totalDecodeTime: 1.5,
        ...overrides,
    };
}

describe("VideoPlaybackWindow", () => {
    it("only sets a baseline with the first counters, then reports their difference", () => {
        const window = new VideoPlaybackWindow();

        expect(window.take(counters(), 100_000)).toBeUndefined();
        const deltas = window.take(
            counters({
                timestampMs: 15_000,
                framesDecoded: 440,
                framesDropped: 3,
                freezeCount: 2,
                totalFreezesDuration: 1.2,
                totalInterFrameDelay: 14.9,
                totalSquaredInterFrameDelay: 0.6,
                totalDecodeTime: 1.9,
            }),
            105_000,
        );

        expect(deltas).toEqual({
            windowSeconds: 5,
            framesDecoded: 140,
            framesDropped: 1,
            freezeCount: 1,
            freezeSeconds: expect.closeTo(0.8),
            pauseCount: 0,
            pauseSeconds: 0,
            interFrameDelaySumSeconds: expect.closeTo(5),
            interFrameDelaySquaredSumSeconds: expect.closeTo(0.2),
            decodeSeconds: expect.closeTo(0.4),
        });
    });

    it("leaves a counter the browser does not expose undefined rather than 0", () => {
        const window = new VideoPlaybackWindow();
        const firefoxLike = { freezeCount: undefined, totalFreezesDuration: undefined };

        window.take(counters(firefoxLike), 100_000);
        const deltas = window.take(counters({ ...firefoxLike, timestampMs: 15_000, framesDecoded: 450 }), 105_000);

        expect(deltas?.framesDecoded).toBe(150);
        expect(deltas?.freezeCount).toBeUndefined();
        expect(deltas?.freezeSeconds).toBeUndefined();
    });

    it("restarts from a baseline when the browser restarts its counters", () => {
        const window = new VideoPlaybackWindow();
        window.take(counters(), 100_000);

        // Renegotiation: a new stats object, counting from 0 again
        expect(window.take(counters({ statsId: "IT02V1", timestampMs: 15_000, framesDecoded: 20 }), 105_000)).toBe(
            undefined,
        );
        // Same object, but a counter went down
        window.take(counters({ timestampMs: 20_000 }), 110_000);
        expect(window.take(counters({ timestampMs: 25_000, framesDecoded: 10 }), 115_000)).toBeUndefined();

        expect(window.take(counters({ timestampMs: 30_000, framesDecoded: 160 }), 120_000)?.framesDecoded).toBe(150);
    });

    it("reports nothing about a deliberate pause, nor about the windows right after it", () => {
        const window = new VideoPlaybackWindow();
        window.take(counters(), 100_000);

        // We stop displaying the stream: the sender pauses it
        window.observe(0, 102_000);
        window.observe(0, 140_000);
        window.observe(20, 141_000);

        // No baseline is taken within 10 s of the pause
        expect(window.take(counters({ timestampMs: 52_000 }), 142_000)).toBeUndefined();
        // The first frame comes back late, and the browser counts the 40 s gap as a pause then
        const paused = { pauseCount: 1, totalPausesDuration: 40 };
        expect(window.take(counters({ ...paused, timestampMs: 57_000, framesDecoded: 400 }), 147_000)).toBe(undefined);
        // The first sample past the period only sets the baseline
        expect(window.take(counters({ ...paused, timestampMs: 62_000, framesDecoded: 550 }), 152_000)).toBe(undefined);

        const deltas = window.take(counters({ ...paused, timestampMs: 67_000, framesDecoded: 700 }), 157_000);
        expect(deltas).toMatchObject({ windowSeconds: 5, framesDecoded: 150, pauseCount: 0, pauseSeconds: 0 });
    });

    it("counts the packets received and lost, a late packet taken back never restarting the window", () => {
        const window = new VideoPlaybackWindow();
        window.take(counters({ packetsReceived: 1000, packetsLost: 10 }), 100_000);

        expect(
            window.take(counters({ timestampMs: 15_000, packetsReceived: 1400, packetsLost: 14 }), 105_000),
        ).toMatchObject({ packetsReceived: 400, packetsLost: 4 });
        // A packet counted as lost arrived late: the lost count goes down, the window stays measurable
        expect(
            window.take(
                counters({ timestampMs: 20_000, framesDecoded: 450, packetsReceived: 1800, packetsLost: 13 }),
                110_000,
            ),
        ).toMatchObject({ windowSeconds: 5, framesDecoded: 150, packetsReceived: 400, packetsLost: 0 });
    });

    // The pause was last seen at t=0, and the first frame only comes back at t=9: a baseline taken at t=7 would put
    // the whole deliberate gap in the window ending at t=12, past the 10 s.
    it.each([
        ["every 5 s", [2_000, 7_000, 12_000]],
        ["throttled", [2_000, 12_000]],
    ])("never reports a deliberate pause counted late in the period that follows it, sampled %s", (_, times) => {
        const window = new VideoPlaybackWindow();
        window.observe(0, 0);
        const countersAt = (t: number) =>
            counters(
                t < 9_000
                    ? { timestampMs: t, framesDecoded: 300 }
                    : {
                          timestampMs: t,
                          framesDecoded: 300 + (t - 9_000) * 0.03,
                          pauseCount: 1,
                          totalPausesDuration: 40,
                      },
            );

        for (const t of times) {
            expect(window.take(countersAt(t), t)).toBeUndefined();
        }
        expect(window.take(countersAt(17_000), 17_000)).toMatchObject({
            windowSeconds: 5,
            pauseCount: 0,
            pauseSeconds: 0,
        });
    });

    it("reports a stall the browser has not counted yet as a window without frames", () => {
        const window = new VideoPlaybackWindow();
        window.take(counters(), 100_000);

        expect(window.take(counters({ timestampMs: 15_000 }), 105_000)).toMatchObject({
            windowSeconds: 5,
            framesDecoded: 0,
            freezeCount: 0,
            pauseCount: 0,
        });
    });
});
