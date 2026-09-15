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
    screenShareRunning = false,
): [number, string][] {
    const decisions: [number, string][] = [];
    samples.forEach((sample, second) => {
        const codec = detector.sample(sample, screenShareRunning, second * 1000);
        if (codec) {
            decisions.push([second, codec]);
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
        const decisions: string[] = [];
        // 100 s of three encoders each reporting at its own time within the second: 301 readings, 76 samples
        for (let tick = 0; tick <= 300; tick++) {
            const codec = detector.sample(stats("cpu"), false, tick * 333);
            if (codec) {
                decisions.push(codec);
            }
        }
        expect(decisions).toHaveLength(1);
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

        expect(run(new CpuLimitationDetector("video"), samples, true)).toHaveLength(0);
        expect(run(new CpuLimitationDetector("video"), samples, false)).toHaveLength(1);
        expect(run(new CpuLimitationDetector("screenSharing"), samples, true)).toHaveLength(1);
    });
});
