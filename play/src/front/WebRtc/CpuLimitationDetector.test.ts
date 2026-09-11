import { describe, expect, it } from "vitest";
import type { LocalEncoderStats } from "./LocalEncoderStats";
import { CpuLimitationDetector, LIMITED_SHARE, WARMUP_SAMPLES, WINDOW_SAMPLES } from "./CpuLimitationDetector";

const LIMITED_SAMPLES = LIMITED_SHARE * WINDOW_SAMPLES;

function stats(
    reason: LocalEncoderStats["qualityLimitationReason"],
    extra: Partial<LocalEncoderStats> = {},
): LocalEncoderStats {
    return {
        source: "P2P",
        frameWidth: 1280,
        frameHeight: 720,
        mimeType: "video/VP9",
        bandwidth: 0,
        fps: 30,
        qualityLimitationReason: reason,
        encoderImplementation: "libvpx",
        encoderCount: 1,
        ...extra,
    };
}

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
        // More encoders on the same transport is not a change
        expect(after(stats("cpu", { source: "P2P (3 encoders)", encoderCount: 3 }))).toHaveLength(2);
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
        const episode = (extra: Partial<LocalEncoderStats>) =>
            Array<LocalEncoderStats>(WARMUP_SAMPLES + WINDOW_SAMPLES).fill(stats("cpu", extra));

        expect(run(new CpuLimitationDetector("screenSharing"), episode({ mimeType: "video/H264" }))).toHaveLength(0);
        expect(run(new CpuLimitationDetector("screenSharing"), episode({ mimeType: "video/VP8" }))).toHaveLength(0);
        expect(run(new CpuLimitationDetector("screenSharing"), episode({ mimeType: undefined }))).toHaveLength(0);
        expect(
            run(new CpuLimitationDetector("screenSharing"), episode({ encoderImplementation: "ExternalEncoder" })),
        ).toHaveLength(0);
        expect(
            run(
                new CpuLimitationDetector("screenSharing"),
                episode({ mimeType: "video/AV1", encoderImplementation: "libaom" }),
            ),
        ).toEqual([[WARMUP_SAMPLES + WINDOW_SAMPLES - 1, "av1"]]);
    });

    it("holds the camera back while a screen share is being sent", () => {
        const episode = limited(WARMUP_SAMPLES + WINDOW_SAMPLES);

        expect(run(new CpuLimitationDetector("video"), episode, true)).toHaveLength(0);
        expect(run(new CpuLimitationDetector("video"), episode, false)).toHaveLength(1);
        expect(run(new CpuLimitationDetector("screenSharing"), episode, true)).toHaveLength(1);
    });
});
