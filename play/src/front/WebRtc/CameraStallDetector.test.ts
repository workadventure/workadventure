import { get, writable, type Writable } from "svelte/store";
import { describe, expect, it, vi } from "vitest";
import type { WebRtcSenderStats } from "../Components/Video/WebRtcStats";
import { cameraUnavailableStore, effectiveCameraStateStore } from "../Stores/MediaStore";
import { registerLocalEncoderStats, type LocalEncoderStats } from "./LocalEncoderStats";
import {
    CAMERA_NO_IMAGE_TOAST_ID,
    CameraStallDetector,
    MAX_RESTARTS,
    RESTART_GRACE_SAMPLES,
    STALL_SAMPLES,
    WARMUP_SAMPLES,
    startCameraStallDetector,
} from "./CameraStallDetector";

const mocks = vi.hoisted(() => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    trackAdminEvent: vi.fn(),
    restartCamera: vi.fn(),
}));
vi.mock("../Stores/MediaStore", async () => {
    const { writable } = await import("svelte/store");
    return {
        effectiveCameraStateStore: writable(false),
        cameraUnavailableStore: writable(false),
        restartCamera: mocks.restartCamera,
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
        expect(run(new CameraStallDetector(), frozen(STALLED_AT + 2))).toEqual([[STALLED_AT, "restart"]]);
    });

    it("marks the camera unavailable when the new one delivers nothing either, and does nothing more", () => {
        expect(run(new CameraStallDetector(), frozen(600))).toEqual([
            [STALLED_AT, "restart"],
            [STALLED_AT + RESTART_GRACE_SAMPLES + STALL_SAMPLES, "unavailable"],
        ]);
    });

    it("lets a camera that came back after the restart be", () => {
        expect(run(new CameraStallDetector(), [...frozen(STALLED_AT + 1), ...live(60)])).toEqual([
            [STALLED_AT, "restart"],
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
        expect(actions).toEqual([...Array<string>(MAX_RESTARTS).fill("restart"), "unavailable"]);
    });

    it("waits for the encoders that have a layer to send, and ignores the others", () => {
        // Dynacast switched every layer off, nobody watching: nothing is expected
        expect(run(new CameraStallDetector(), samples(30, stats(encoder(0, 0))))).toEqual([]);
        // P2P: a peer hiding our tile switched its encoder off, another one still receives frames
        expect(run(new CameraStallDetector(), samples(30, stats(encoder(0, 0), encoder(30))))).toEqual([]);
        // Every encoder that has something to send gets nothing
        expect(run(new CameraStallDetector(), samples(STALLED_AT + 1, stats(encoder(0, 0), encoder(0))))).toEqual([
            [STALLED_AT, "restart"],
        ]);
    });

    it("ignores a publication paused without its track, as at the end of a megaphone turn", () => {
        const paused = { ...encoder(0), hasTrack: false };
        // The camera goes on in the meeting while the megaphone room's publication is paused
        expect(run(new CameraStallDetector(), samples(30, stats(paused, encoder(30))))).toEqual([]);
        // The paused publication alone says nothing about the camera
        expect(run(new CameraStallDetector(), samples(30, stats(paused)))).toEqual([]);
    });

    it("does not judge a browser that does not report the active layers", () => {
        const silent = { ...encoder(0), activeLayers: undefined, activeFps: undefined };
        expect(run(new CameraStallDetector(), samples(30, stats(silent)))).toEqual([]);
    });

    it("judges the camera by what it delivers, not by what the encoder outputs", () => {
        const encoderSilent = { ...encoder(0), captureFps: 30 };
        expect(run(new CameraStallDetector(), samples(30, stats(encoderSilent)))).toEqual([]);
        const sourceFrozen = { ...encoder(0), captureFps: 0 };
        expect(run(new CameraStallDetector(), samples(STALLED_AT + 1, stats(sourceFrozen)))).toEqual([
            [STALLED_AT, "restart"],
        ]);
    });

    it("ignores the limitation reason: a LiveKit sender reports bandwidth for minutes, frozen or not", () => {
        const frozenAndLimited = { ...encoder(0), qualityLimitationReason: "bandwidth" as const };
        expect(run(new CameraStallDetector(), samples(STALLED_AT + 1, stats(frozenAndLimited)))).toEqual([
            [STALLED_AT, "restart"],
        ]);
    });

    it("starts over when the camera stops being encoded", () => {
        const interrupted = [...frozen(STALLED_AT), undefined, ...frozen(WARMUP_SAMPLES)];
        expect(run(new CameraStallDetector(), interrupted)).toEqual([]);
    });
});

describe("startCameraStallDetector", () => {
    it("restarts a frozen camera once, marks it unavailable without turning it off, and warns while it is", () => {
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
        expect(mocks.restartCamera).not.toHaveBeenCalled();
        expect(get(unavailable)).toBe(false);

        // On and frozen: asked for again once, then unavailable once, however long it lasts
        cameraOn.set(true);
        feed(60);
        expect(mocks.restartCamera).toHaveBeenCalledOnce();
        expect(get(unavailable)).toBe(true);
        expect(mocks.trackAdminEvent.mock.calls).toEqual([
            ["media.device_error", { kind: "camera", reason: "stalled" }],
            ["media.device_error", { kind: "camera", reason: "stalled_after_restart" }],
        ]);
        expect(mocks.addToast).toHaveBeenCalledWith(expect.anything(), {}, CAMERA_NO_IMAGE_TOAST_ID);

        // A new camera, or the user turning it off, lifts it: so does the warning
        mocks.removeToast.mockClear();
        unavailable.set(false);
        expect(mocks.removeToast).toHaveBeenCalledWith(CAMERA_NO_IMAGE_TOAST_ID);
        // The new camera is judged from scratch, even if the senders reported nothing meanwhile
        feed(WARMUP_SAMPLES);
        expect(mocks.restartCamera).toHaveBeenCalledOnce();
        feed(STALL_SAMPLES);
        expect(mocks.restartCamera).toHaveBeenCalledTimes(2);

        // Marked by someone else (a getUserMedia that did not answer): warned all the same
        unavailable.set(false);
        mocks.addToast.mockClear();
        unavailable.set(true);
        expect(mocks.addToast).toHaveBeenCalledWith(expect.anything(), {}, CAMERA_NO_IMAGE_TOAST_ID);

        unregister();
        vi.useRealTimers();
    });
});
