import { writable, type Writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import type { WebRtcSenderStats } from "../Components/Video/WebRtcStats";
import { effectiveCameraStateStore } from "../Stores/MediaStore";
import { registerLocalEncoderStats, type LocalEncoderStats } from "./LocalEncoderStats";
import {
    CameraStallDetector,
    MAX_RESTARTS,
    RESTART_GRACE_SAMPLES,
    STALL_SAMPLES,
    WARMUP_SAMPLES,
    startCameraStallDetector,
} from "./CameraStallDetector";

const mocks = vi.hoisted(() => ({
    restartCamera: vi.fn(),
    disableWebcam: vi.fn(),
    addToast: vi.fn(),
    removeToast: vi.fn(),
}));
vi.mock("../Stores/MediaStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        effectiveCameraStateStore: writable(false),
        requestedCameraState: { disableWebcam: mocks.disableWebcam },
        restartCamera: mocks.restartCamera,
    };
});
vi.mock("../Stores/ToastStoreSingleton", () => ({
    toastStore: { addToast: mocks.addToast, removeToast: mocks.removeToast },
}));
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
    it("asks for the camera again after 3 seconds without a frame, once the encoders are warm", () => {
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

    it("restarts a camera that came back each time it freezes, until it froze too often", () => {
        const detector = new CameraStallDetector();
        // Each episode: frozen until the detector acts, then the new camera works for a while
        const actions: string[] = [];
        let second = 0;
        for (let episode = 0; episode <= MAX_RESTARTS; episode++) {
            const episodeSamples = [...frozen(RESTART_GRACE_SAMPLES + STALL_SAMPLES), ...live(20)];
            actions.push(...run(detector, episodeSamples, second).map(([, action]) => action));
            second += episodeSamples.length;
        }
        expect(actions).toEqual([...Array<string>(MAX_RESTARTS).fill("restart"), "give_up"]);
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

    it("ignores the limitation reason: a LiveKit sender reports bandwidth for minutes, frozen or not", () => {
        const frozenAndLimited = { ...encoder(0), qualityLimitationReason: "bandwidth" as const };
        expect(
            run(new CameraStallDetector(), samples(WARMUP_SAMPLES + STALL_SAMPLES, stats(frozenAndLimited))),
        ).toEqual([[WARMUP_SAMPLES + STALL_SAMPLES - 1, "restart"]]);
    });

    it("starts over when the camera stops being encoded", () => {
        const interrupted = [...frozen(WARMUP_SAMPLES + STALL_SAMPLES - 1), undefined, ...frozen(WARMUP_SAMPLES)];
        expect(run(new CameraStallDetector(), interrupted)).toEqual([]);
    });
});

describe("startCameraStallDetector", () => {
    it("leaves alone a camera the user turned off, and restarts a camera that is on and frozen", () => {
        vi.useFakeTimers();
        const cameraOn = effectiveCameraStateStore as unknown as Writable<boolean>;
        const encoderStats = writable<WebRtcSenderStats | undefined>(undefined);
        const unregister = registerLocalEncoderStats("video", encoderStats);
        startCameraStallDetector();
        const feed = (seconds: number) => {
            for (let second = 0; second < seconds; second++) {
                vi.advanceTimersByTime(1000);
                encoderStats.set(encoder(0));
            }
        };

        // Turned off by the user: the senders stay, with an active layer and nothing to encode
        cameraOn.set(false);
        feed(20);
        expect(mocks.restartCamera).not.toHaveBeenCalled();
        expect(mocks.addToast).not.toHaveBeenCalled();

        cameraOn.set(true);
        feed(WARMUP_SAMPLES + STALL_SAMPLES);
        expect(mocks.restartCamera).toHaveBeenCalledOnce();

        unregister();
        vi.useRealTimers();
    });
});
