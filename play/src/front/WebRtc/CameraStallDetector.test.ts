import { describe, expect, it, vi } from "vitest";
import type { WebRtcSenderStats } from "../Components/Video/WebRtcStats";
import type { LocalEncoderStats } from "./LocalEncoderStats";
import {
    CameraStallDetector,
    RESTART_GRACE_SAMPLES,
    RETRY_WINDOW_MS,
    STALL_SAMPLES,
    WARMUP_SAMPLES,
} from "./CameraStallDetector";

// Only the detector's decisions are under test, not its wiring
vi.mock("../Stores/MediaStore", () => ({ requestedCameraState: {}, restartCamera: vi.fn() }));
vi.mock("../Stores/ToastStoreSingleton", () => ({ toastStore: {} }));
vi.mock("../Components/Toasts/CameraNoImageToast.svelte", () => ({ default: {} }));
vi.mock("../Administration/AnalyticsClient", () => ({ analyticsClient: { trackAdminEvent: vi.fn() } }));

function encoder(activeFps: number | undefined, activeLayers: number | undefined = 1): WebRtcSenderStats {
    return {
        source: "Livekit",
        frameWidth: 1280,
        frameHeight: 720,
        mimeType: "video/VP9",
        bandwidth: 0,
        fps: activeFps ?? 0,
        activeLayers,
        activeFps,
        qualityLimitationReason: "none",
    };
}

function stats(...encoders: WebRtcSenderStats[]): LocalEncoderStats {
    return { ...encoders[0], encoders };
}

const samples = (count: number, sample: LocalEncoderStats) => Array<LocalEncoderStats>(count).fill(sample);
const frozen = (count: number) => samples(count, stats(encoder(0)));
const live = (count: number) => samples(count, stats(encoder(30)));

// Feeds one sample a second, from `startSecond`, and returns the decisions with the second they were taken at
function run(
    detector: CameraStallDetector,
    samples: (LocalEncoderStats | undefined)[],
    startSecond = 0,
): [number, string][] {
    const decisions: [number, string][] = [];
    samples.forEach((sample, index) => {
        const second = startSecond + index;
        const action = detector.sample(sample, second * 1000);
        if (action) {
            decisions.push([second, action]);
        }
    });
    return decisions;
}

describe("CameraStallDetector", () => {
    it("asks for the camera again after 5 seconds without a frame, once the encoders are warm", () => {
        expect(run(new CameraStallDetector(), frozen(WARMUP_SAMPLES + STALL_SAMPLES + 2))).toEqual([
            [WARMUP_SAMPLES + STALL_SAMPLES - 1, "restart"],
        ]);
    });

    it("turns the camera off when the new one delivers nothing either", () => {
        const restartAt = WARMUP_SAMPLES + STALL_SAMPLES - 1;
        expect(
            run(new CameraStallDetector(), frozen(WARMUP_SAMPLES + 2 * STALL_SAMPLES + RESTART_GRACE_SAMPLES)),
        ).toEqual([
            [restartAt, "restart"],
            [restartAt + RESTART_GRACE_SAMPLES + STALL_SAMPLES, "give_up"],
        ]);
    });

    it("restarts again, rather than giving up, a camera that worked for longer than the retry window", () => {
        const detector = new CameraStallDetector();
        expect(run(detector, frozen(WARMUP_SAMPLES + STALL_SAMPLES))).toEqual([
            [WARMUP_SAMPLES + STALL_SAMPLES - 1, "restart"],
        ]);
        // The new camera works, then freezes again long after
        const workingSeconds = RETRY_WINDOW_MS / 1000;
        const start = WARMUP_SAMPLES + STALL_SAMPLES;
        expect(run(detector, [...live(workingSeconds), ...frozen(STALL_SAMPLES)], start)).toEqual([
            [start + workingSeconds + STALL_SAMPLES - 1, "restart"],
        ]);
    });

    it("waits for the encoders that have a layer to send, and ignores the others", () => {
        // Dynacast switched every layer off, nobody watching: nothing is expected
        expect(run(new CameraStallDetector(), samples(30, stats(encoder(0, 0))))).toEqual([]);
        // P2P: a peer hiding our tile switched its encoder off, another one still receives frames
        expect(run(new CameraStallDetector(), samples(30, stats(encoder(0, 0), encoder(30))))).toEqual([]);
        // Every encoder that has something to send gets nothing
        expect(
            run(new CameraStallDetector(), samples(WARMUP_SAMPLES + STALL_SAMPLES, stats(encoder(0, 0), encoder(0)))),
        ).toEqual([[WARMUP_SAMPLES + STALL_SAMPLES - 1, "restart"]]);
    });

    it("does not judge a browser that does not report the active layers", () => {
        const silent = { ...encoder(0), activeLayers: undefined, activeFps: undefined };
        expect(run(new CameraStallDetector(), samples(30, stats(silent)))).toEqual([]);
    });

    it("starts over when the camera stops being encoded", () => {
        const interrupted = [...frozen(WARMUP_SAMPLES + STALL_SAMPLES - 1), undefined, ...frozen(WARMUP_SAMPLES)];
        expect(run(new CameraStallDetector(), interrupted)).toEqual([]);
    });
});
