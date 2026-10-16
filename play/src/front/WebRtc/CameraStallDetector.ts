import { derived } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";
import CameraUnavailableToast from "../Components/Toasts/CameraUnavailableToast.svelte";
import { cameraUnavailableStore, effectiveCameraStateStore } from "../Stores/MediaStore";
import { toastStore } from "../Stores/ToastStoreSingleton";
import { localEncoderStatsStore, type LocalEncoderStats } from "./LocalEncoderStats";

/**
 * Spots a camera that stops delivering frames while it is on.
 *
 * A frozen camera (taken by another application, a laptop waking up, a USB hiccup) stays "live", and Chrome does
 * not even mark the track muted: neither LiveKit nor the peers know. The people already watching keep the last
 * frame, every tile mounted afterwards (someone arriving, coming back from a break) shows "No video stream
 * received", and the user sees a black preview.
 *
 * The senders tell: with a layer to send, a camera hands them frames all the time. None for 3 seconds means the
 * source delivers nothing. What counts is what the source hands the sender (RTCVideoSourceStats), not what the encoder
 * outputs; browsers that do not report the source fall back to the encoder.
 *
 * The camera is then marked unavailable ("no_image", see cameraUnavailableStore): it stops being sent, so the others
 * get the avatar with "Camera unavailable" instead of a red tile, and the user is told. Nothing is turned off behind
 * the user's back: the camera stays wanted, and is asked for again when the user returns to the tab, a conversation
 * starts, or on "Try again". Restarting it on our own, then turning it off (#6742) left people with no camera for
 * hours when the new getUserMedia never answered, and read as a camera turned off on purpose.
 *
 * The limitation reason is no help: it stays set while the adaptation is in force, a LiveKit sender reports
 * "bandwidth" for minutes on end, and a frozen camera never moves it.
 *
 * Firefox does not report which layers are active: it never gets here.
 */

// No frame for 3 seconds: back before a tile mounted meanwhile shows "No video stream received" (5 seconds).
// Not less: one sample a second.
export const STALL_SAMPLES = 3;
// Encoders starting deliver nothing for a moment
export const WARMUP_SAMPLES = 3;
const SAMPLE_INTERVAL_MS = 1000;

export class CameraStallDetector {
    private stalledSamples = 0;
    private warmup = WARMUP_SAMPLES;
    private lastSampleTime = -Infinity;

    /**
     * Feeds one reading of the aggregated camera encoder stats. Returns true while the camera has delivered nothing for
     * STALL_SAMPLES seconds.
     */
    public sample(stats: LocalEncoderStats | undefined, now: number = Date.now()): boolean {
        if (!stats) {
            // Camera off, or nobody to send it to: start over
            this.stalledSamples = 0;
            this.warmup = WARMUP_SAMPLES;
            return false;
        }
        if (now - this.lastSampleTime < SAMPLE_INTERVAL_MS) {
            // Several encoders tick separately: one sample a second whatever their number
            return false;
        }
        this.lastSampleTime = now;
        if (this.warmup > 0) {
            this.warmup--;
            return false;
        }
        // Only an encoder with a layer to send and a track is expected to encode: dynacast switches the layers nobody
        // watches off, a P2P peer hiding our tile switches its encoder off, and LiveKit pauses the publication of a
        // room we no longer send our camera to (the end of a megaphone turn) by detaching its track, while the camera
        // goes on in another room.
        const expected = stats.encoders.filter(
            (encoder) => (encoder.activeLayers ?? 0) > 0 && encoder.hasTrack !== false,
        );
        if (expected.length === 0 || stats.encoders.some((encoder) => encoder.activeLayers === undefined)) {
            this.stalledSamples = 0;
            return false;
        }
        if (expected.some((encoder) => (encoder.captureFps ?? encoder.activeFps ?? 0) > 0)) {
            this.stalledSamples = 0;
            return false;
        }
        this.stalledSamples++;
        return this.stalledSamples >= STALL_SAMPLES;
    }
}

export const CAMERA_UNAVAILABLE_TOAST_ID = "camera-unavailable";

/**
 * Fed by the stats of the local camera feedback tile, like CpuLimitationDetector: no getStats() call of its own.
 *
 * Only while the camera is on: a camera the user turned off leaves its senders in place, with an active layer and
 * nothing to encode, which must not read as a frozen camera. Nor while it is already unavailable: the senders can
 * keep reporting nothing, and the camera that replaces it is judged from scratch.
 *
 * Also shows the warning whenever the camera is unavailable, whoever marked it (here, or a getUserMedia that did not
 * answer).
 */
export function startCameraStallDetector(): void {
    const detector = new CameraStallDetector();
    const cameraStatsStore = derived(
        [localEncoderStatsStore.video, effectiveCameraStateStore, cameraUnavailableStore],
        ([$stats, $cameraOn, $cameraUnavailable]) => ($cameraOn && !$cameraUnavailable ? $stats : undefined),
    );
    // Module singletons: never unsubscribed
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    cameraUnavailableStore.subscribe((unavailable) => {
        if (unavailable) {
            toastStore.addToast(CameraUnavailableToast, {}, CAMERA_UNAVAILABLE_TOAST_ID);
        } else {
            toastStore.removeToast(CAMERA_UNAVAILABLE_TOAST_ID);
        }
    });
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    cameraStatsStore.subscribe((stats) => {
        if (detector.sample(stats)) {
            console.warn("The camera has delivered no frame for 3 seconds: it is unavailable");
            analyticsClient.trackAdminEvent("media.device_error", { kind: "camera", reason: "stalled" });
            cameraUnavailableStore.set("no_image");
        }
    });
}
