import { describe, expect, it } from "vitest";
import type { WebRtcSenderStats } from "../Components/Video/WebRtcStats";
import type { LocalEncoderStats } from "./LocalEncoderStats";
import { CpuLimitationDetector, LIMITED_SHARE, WARMUP_SAMPLES, WINDOW_SAMPLES } from "./CpuLimitationDetector";

const LIMITED_SAMPLES = LIMITED_SHARE * WINDOW_SAMPLES;

// A single-encoder aggregate by default; pass `encoders` to give the summary a set that disagrees with it
function stats(
    reason: LocalEncoderStats["qualityLimitationReason"],
    extra: Partial<LocalEncoderStats> = {},
): LocalEncoderStats {
    const { encoders, ...summary } = extra;
    const encoder: WebRtcSenderStats = {
        source: "P2P",
        frameWidth: 1280,
        frameHeight: 720,
        mimeType: "video/VP9",
        bandwidth: 0,
        fps: 30,
        qualityLimitationReason: reason,
        encoderImplementation: "libvpx",
        ...summary,
    };
    return { ...encoder, encoders: encoders ?? [encoder] };
}

// WINDOW + warm-up samples of the same aggregate: the shortest episode that can produce a decision
const episode = (sample: LocalEncoderStats) => Array<LocalEncoderStats>(WARMUP_SAMPLES + WINDOW_SAMPLES).fill(sample);

const decisions = (samples: LocalEncoderStats[]) => run(new CpuLimitationDetector("screenSharing"), samples);

// Feeds one sample a second and returns the decisions, in order, with the second they were taken at
function run(
    detector: CpuLimitationDetector,
    samples: (LocalEncoderStats | undefined)[],
    context = { screenShareRunning: false, flagRaised: true },
): [number, string][] {
    const decisions: [number, string][] = [];
    const state = { ...context };
    samples.forEach((sample, second) => {
        const action = detector.sample(sample, state, second * 1000);
        if (action) {
            decisions.push([second, action.kind === "flag" ? "flag" : action.codec]);
            // The flag stays up for the session, as the wiring does
            state.flagRaised ||= action.kind === "flag";
        }
    });
    return decisions;
}

const limited = (count: number) => Array<LocalEncoderStats>(count).fill(stats("cpu"));
const fine = (count: number) => Array<LocalEncoderStats>(count).fill(stats("none"));

describe("CpuLimitationDetector", () => {
    it("demotes the codec once the encoder was limited for most of a full window, after the warm-up", () => {
        const detector = new CpuLimitationDetector("screenSharing");

        expect(run(detector, limited(WARMUP_SAMPLES + WINDOW_SAMPLES + 5))).toEqual([
            [WARMUP_SAMPLES + WINDOW_SAMPLES - 1, "vp9"],
        ]);
    });

    it("tolerates gaps in the episode and ignores a lone spike", () => {
        const episodeWithGaps = [...limited(30), ...fine(5), ...limited(12), ...fine(3), ...limited(10)];
        expect(
            run(new CpuLimitationDetector("screenSharing"), [...fine(WARMUP_SAMPLES), ...episodeWithGaps]),
        ).toHaveLength(1);

        const spike = [...fine(20), ...limited(LIMITED_SAMPLES - 1), ...fine(WINDOW_SAMPLES)];
        expect(run(new CpuLimitationDetector("screenSharing"), [...fine(WARMUP_SAMPLES), ...spike])).toHaveLength(0);
    });

    it("waits a full window after a decision before the next one", () => {
        const decisions = run(
            new CpuLimitationDetector("screenSharing"),
            limited(WARMUP_SAMPLES + 3 * WINDOW_SAMPLES + 2),
        );

        expect(decisions.map(([second]) => second)).toEqual([
            WARMUP_SAMPLES + WINDOW_SAMPLES - 1,
            WARMUP_SAMPLES + 2 * WINDOW_SAMPLES,
            WARMUP_SAMPLES + 3 * WINDOW_SAMPLES + 1,
        ]);
    });

    it("starts over when the stream, the transport or the codec changes", () => {
        // One sample short of a decision, twice: a decision only comes if the second run continues the first
        const almost = limited(WARMUP_SAMPLES + WINDOW_SAMPLES - 1);
        const rest = limited(WARMUP_SAMPLES + WINDOW_SAMPLES - 2);
        const after = (change: LocalEncoderStats | undefined) =>
            run(new CpuLimitationDetector("screenSharing"), [...almost, change, ...rest]);

        expect(after(undefined)).toHaveLength(0);
        expect(after(stats("cpu", { source: "Livekit" }))).toHaveLength(0);
        expect(after(stats("cpu", { mimeType: "video/H264" }))).toHaveLength(0);
        // A peer joining or leaving is not a change, as long as the set stays on the same codec
        const encoder = stats("cpu");
        expect(after(stats("cpu", { encoders: [encoder, encoder, encoder] }))).toHaveLength(2);
    });

    it("takes one sample a second, however many encoders tick", () => {
        const detector = new CpuLimitationDetector("screenSharing");
        const samplesNeeded = WARMUP_SAMPLES + WINDOW_SAMPLES;
        // Three encoders, each reporting at its own time within the second. A sample is taken a second after the
        // previous one, so a reading every 333 ms is sampled every fourth reading: this is just enough readings
        // for one decision.
        const readings = samplesNeeded * 4;
        const decisionTicks: number[] = [];
        for (let tick = 0; tick <= readings; tick++) {
            const action = detector.sample(stats("cpu"), { screenShareRunning: false, flagRaised: true }, tick * 333);
            if (action) {
                decisionTicks.push(tick);
            }
        }
        // Sampling every reading instead would have decided three times sooner, and more than once by now
        expect(decisionTicks).toHaveLength(1);
        expect(decisionTicks[0]).toBeGreaterThan(samplesNeeded * 2);
    });

    it("leaves H.264, VP8 and hardware encoders alone", () => {
        expect(decisions(episode(stats("cpu", { mimeType: "video/H264" })))).toHaveLength(0);
        expect(decisions(episode(stats("cpu", { mimeType: "video/VP8" })))).toHaveLength(0);
        expect(decisions(episode(stats("cpu", { mimeType: undefined })))).toHaveLength(0);
        expect(decisions(episode(stats("cpu", { encoderImplementation: "ExternalEncoder" })))).toHaveLength(0);
        expect(decisions(episode(stats("cpu", { mimeType: "video/AV1", encoderImplementation: "libaom" })))).toEqual([
            [WARMUP_SAMPLES + WINDOW_SAMPLES - 1, "av1"],
        ]);
    });

    it("only demotes a codec every encoder of the set is on", () => {
        // P2P peers negotiate separately: the summary holds the codec of the most limited one, which is nobody's
        // codec to leave when they differ
        const mixed = (...mimeTypes: (string | undefined)[]) =>
            stats("cpu", { encoders: mimeTypes.map((mimeType) => stats("cpu", { mimeType })) });

        expect(decisions(episode(mixed("video/VP9", "video/AV1")))).toHaveLength(0);
        expect(decisions(episode(mixed("video/VP9", undefined)))).toHaveLength(0);
        expect(decisions(episode(mixed("video/AV1", "video/AV1")))).toEqual([
            [WARMUP_SAMPLES + WINDOW_SAMPLES - 1, "av1"],
        ]);
    });

    it("weighs the whole set, not the encoder the summary happens to describe", () => {
        const software = stats("cpu");
        const hardware = stats("cpu", { encoderImplementation: "ExternalEncoder" });
        const set = (summary: LocalEncoderStats, encoders: LocalEncoderStats[]) => episode({ ...summary, encoders });

        // The summary names the hardware encoder, but a software one is still burning CPU: demote
        expect(decisions(set(hardware, [software, hardware]))).toHaveLength(1);
        // Every encoder is hardware: a cheaper codec gains nothing, whichever one the summary names
        expect(decisions(set(software, [hardware, hardware]))).toHaveLength(0);
    });

    it("holds the camera back while a screen share is being sent", () => {
        const samples = episode(stats("cpu"));
        const sharing = { screenShareRunning: true, flagRaised: true };
        const notSharing = { screenShareRunning: false, flagRaised: true };

        expect(run(new CpuLimitationDetector("video"), samples, sharing)).toHaveLength(0);
        expect(run(new CpuLimitationDetector("video"), samples, notSharing)).toHaveLength(1);
        expect(run(new CpuLimitationDetector("screenSharing"), samples, sharing)).toHaveLength(1);
    });

    it("asks for LiveKit before touching the codec when it encodes for several P2P peers", () => {
        const flagDown = { screenShareRunning: false, flagRaised: false };
        const peer = stats("cpu");
        const threePeers = Array<LocalEncoderStats>(WARMUP_SAMPLES + 2 * WINDOW_SAMPLES + 1).fill({
            ...peer,
            encoders: [peer, peer, peer],
        });

        // The flag first; the back not switching (no LiveKit), the next window falls through to the codec
        expect(run(new CpuLimitationDetector("video"), threePeers, flagDown)).toEqual([
            [WARMUP_SAMPLES + WINDOW_SAMPLES - 1, "flag"],
            [WARMUP_SAMPLES + 2 * WINDOW_SAMPLES, "vp9"],
        ]);
        // Whatever the codec: a hardware encoder gains from fewer encoders too
        const hardwarePeer = stats("cpu", { encoderImplementation: "ExternalEncoder" });
        const hardware = threePeers.map((sample) => ({
            ...sample,
            encoderImplementation: "ExternalEncoder",
            encoders: [hardwarePeer, hardwarePeer, hardwarePeer],
        }));
        expect(run(new CpuLimitationDetector("video"), hardware, flagDown)).toEqual([
            [WARMUP_SAMPLES + WINDOW_SAMPLES - 1, "flag"],
        ]);
        // Not for a single peer, not on LiveKit, not twice
        expect(run(new CpuLimitationDetector("video"), limited(WARMUP_SAMPLES + WINDOW_SAMPLES), flagDown)).toEqual([
            [WARMUP_SAMPLES + WINDOW_SAMPLES - 1, "vp9"],
        ]);
        const livekit = Array<LocalEncoderStats>(WARMUP_SAMPLES + WINDOW_SAMPLES).fill(
            stats("cpu", { source: "Livekit" }),
        );
        expect(run(new CpuLimitationDetector("video"), livekit, flagDown)).toEqual([
            [WARMUP_SAMPLES + WINDOW_SAMPLES - 1, "vp9"],
        ]);
    });
});
