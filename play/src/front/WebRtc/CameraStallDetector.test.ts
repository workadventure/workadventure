import { get, writable, type Writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import type { WebRtcSenderStats } from "../Components/Video/WebRtcStats";
import { cameraUnavailableStore, effectiveCameraStateStore } from "../Stores/MediaStore";
import { registerLocalEncoderStats, type LocalEncoderStats } from "./LocalEncoderStats";
import {
    CAMERA_NO_IMAGE_TOAST_ID,
    CameraStallDetector,
    STALL_SAMPLES,
    WARMUP_SAMPLES,
    startCameraStallDetector,
} from "./CameraStallDetector";

const mocks = vi.hoisted(() => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    trackAdminEvent: vi.fn(),
}));
vi.mock("../Stores/MediaStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        effectiveCameraStateStore: writable(false),
        cameraUnavailableStore: writable(false),
    };
});
vi.mock("../Stores/ToastStoreSingleton", () => ({
    toastStore: { addToast: mocks.addToast, removeToast: mocks.removeToast },
}));
vi.mock("../Components/Toasts/CameraNoImageToast.svelte", () => ({ default: {} }));
vi.mock("../Administration/AnalyticsClient", () => ({
    analyticsClient: { trackAdminEvent: mocks.trackAdminEvent },
}));

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
// The second the camera is first found stalled
const STALLED_AT = WARMUP_SAMPLES + STALL_SAMPLES - 1;

// Feeds one sample a second and returns the second the detector first says the camera delivers nothing
function firstStall(detector: CameraStallDetector, samples: (LocalEncoderStats | undefined)[]): number | undefined {
    const second = samples.findIndex((sample, index) => detector.sample(sample, index * 1000));
    return second === -1 ? undefined : second;
}

describe("CameraStallDetector", () => {
    it("finds a camera that delivered nothing for 3 seconds, once the encoders are warm", () => {
        expect(firstStall(new CameraStallDetector(), frozen(30))).toBe(STALLED_AT);
    });

    it("starts counting again at each frame", () => {
        const blinking = Array.from({ length: 10 }, () => [...frozen(STALL_SAMPLES - 1), ...live(1)]).flat();
        expect(firstStall(new CameraStallDetector(), [...frozen(WARMUP_SAMPLES), ...blinking])).toBeUndefined();
    });

    it("waits for the encoders that have a layer to send, and ignores the others", () => {
        // Dynacast switched every layer off, nobody watching: nothing is expected
        expect(firstStall(new CameraStallDetector(), samples(30, stats(encoder(0, 0))))).toBeUndefined();
        // P2P: a peer hiding our tile switched its encoder off, another one still receives frames
        expect(firstStall(new CameraStallDetector(), samples(30, stats(encoder(0, 0), encoder(30))))).toBeUndefined();
        // Every encoder that has something to send gets nothing
        expect(firstStall(new CameraStallDetector(), samples(30, stats(encoder(0, 0), encoder(0))))).toBe(STALLED_AT);
    });

    it("does not judge a browser that does not report the active layers", () => {
        const silent = { ...encoder(0), activeLayers: undefined, activeFps: undefined };
        expect(firstStall(new CameraStallDetector(), samples(30, stats(silent)))).toBeUndefined();
    });

    it("judges the camera by what it delivers, not by what the encoder outputs", () => {
        const encoderSilent = { ...encoder(0), captureFps: 30 };
        expect(firstStall(new CameraStallDetector(), samples(30, stats(encoderSilent)))).toBeUndefined();
        const sourceFrozen = { ...encoder(0), captureFps: 0 };
        expect(firstStall(new CameraStallDetector(), samples(30, stats(sourceFrozen)))).toBe(STALLED_AT);
    });

    it("ignores the limitation reason: a LiveKit sender reports bandwidth for minutes, frozen or not", () => {
        const frozenAndLimited = { ...encoder(0), qualityLimitationReason: "bandwidth" as const };
        expect(firstStall(new CameraStallDetector(), samples(30, stats(frozenAndLimited)))).toBe(STALLED_AT);
    });

    it("starts over when the camera stops being encoded", () => {
        const interrupted = [...frozen(STALLED_AT), undefined, ...frozen(WARMUP_SAMPLES)];
        expect(firstStall(new CameraStallDetector(), interrupted)).toBeUndefined();
    });
});

describe("startCameraStallDetector", () => {
    it("marks a frozen camera unavailable without touching it, and warns for as long as it is", () => {
        vi.useFakeTimers();
        const cameraOn = effectiveCameraStateStore as unknown as Writable<boolean>;
        const unavailable = cameraUnavailableStore;
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
        expect(get(unavailable)).toBe(false);
        expect(mocks.addToast).not.toHaveBeenCalled();

        // On and frozen: unavailable once, however long it lasts
        cameraOn.set(true);
        feed(60);
        expect(get(unavailable)).toBe(true);
        expect(mocks.trackAdminEvent).toHaveBeenCalledOnce();
        expect(mocks.trackAdminEvent).toHaveBeenCalledWith("media.device_error", { kind: "camera", reason: "stalled" });
        expect(mocks.addToast).toHaveBeenCalledWith(expect.anything(), {}, CAMERA_NO_IMAGE_TOAST_ID);

        // A new camera, or the user turning it off, lifts it: so does the warning
        mocks.removeToast.mockClear();
        unavailable.set(false);
        expect(mocks.removeToast).toHaveBeenCalledWith(CAMERA_NO_IMAGE_TOAST_ID);

        // Marked by someone else (a getUserMedia that did not answer): warned all the same
        mocks.addToast.mockClear();
        unavailable.set(true);
        expect(mocks.addToast).toHaveBeenCalledWith(expect.anything(), {}, CAMERA_NO_IMAGE_TOAST_ID);

        unregister();
        vi.useRealTimers();
    });
});
