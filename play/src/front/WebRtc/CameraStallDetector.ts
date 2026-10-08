import { derived } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";
import CameraNoImageToast from "../Components/Toasts/CameraNoImageToast.svelte";
import { effectiveCameraStateStore, requestedCameraState, restartCamera } from "../Stores/MediaStore";
import { toastStore } from "../Stores/ToastStoreSingleton";
import { localEncoderStatsStore, type LocalEncoderStats } from "./LocalEncoderStats";

/**
 * Reacts to a camera that stops delivering frames while it is on.
 *
 * A frozen camera (taken by another application, a laptop waking up, a USB hiccup) stays "live", and Chrome does
 * not even mark the track muted: neither LiveKit nor the peers know. The people already watching keep the last
 * frame, every tile mounted afterwards (someone arriving, coming back from a break) shows "No video stream
 * received", and the user sees a black preview.
 *
 * The encoders tell: with a layer to send, a camera has frames to encode all the time. None for 3 seconds, while the
 * browser reports no bandwidth or CPU limitation (a congested network can hold every frame back for a moment),
 * means the source delivers nothing. We first ask for the camera again, what the user would do by turning it off and on. If
 * the new one stays silent too, the camera is turned off, so that the others get the avatar instead of a red tile,
 * and the user is told why. Switching to another camera is left to the user: the other one may be the camera of a
 * closed laptop, or point elsewhere.
 *
 * Firefox does not report which layers are active: it never gets here.
 */

export type CameraStallAction = "restart" | "give_up";

// No frame for 3 seconds: back before a tile mounted meanwhile shows "No video stream received" (5 seconds).
// Not less: one sample a second, and a congested network can stall the encoder for a second or two.
export const STALL_SAMPLES = 3;
// Encoders starting deliver nothing for a moment
export const WARMUP_SAMPLES = 3;
// Room for getUserMedia to hand over the new camera
export const RESTART_GRACE_SAMPLES = 5;
// A camera that stalls again this soon after a restart is not coming back by itself
export const RETRY_WINDOW_MS = 60_000;
const SAMPLE_INTERVAL_MS = 1000;

export class CameraStallDetector {
    private stalledSamples = 0;
    private warmup = WARMUP_SAMPLES;
    private lastSampleTime = -Infinity;
    private lastRestartTime = -Infinity;

    /**
     * Feeds one reading of the aggregated camera encoder stats. Returns the action to take when it is time.
     */
    public sample(stats: LocalEncoderStats | undefined, now: number = Date.now()): CameraStallAction | undefined {
        if (!stats) {
            // Camera off, or nobody to send it to: start over
            this.stalledSamples = 0;
            this.warmup = WARMUP_SAMPLES;
            return undefined;
        }
        if (now - this.lastSampleTime < SAMPLE_INTERVAL_MS) {
            // Several encoders tick separately: one sample a second whatever their number
            return undefined;
        }
        this.lastSampleTime = now;
        if (this.warmup > 0) {
            this.warmup--;
            return undefined;
        }
        // Only an encoder with a layer to send is expected to encode: dynacast switches the layers nobody watches
        // off, and a P2P peer hiding our tile switches its encoder off.
        const expected = stats.encoders.filter((encoder) => (encoder.activeLayers ?? 0) > 0);
        if (
            expected.length === 0 ||
            stats.encoders.some((encoder) => encoder.activeLayers === undefined) ||
            expected.some((encoder) => (encoder.activeFps ?? 0) > 0) ||
            // The browser holds frames back on purpose: not the camera's doing
            expected.some(
                (encoder) =>
                    encoder.qualityLimitationReason === "bandwidth" || encoder.qualityLimitationReason === "cpu",
            )
        ) {
            this.stalledSamples = 0;
            return undefined;
        }
        this.stalledSamples++;
        if (this.stalledSamples < STALL_SAMPLES) {
            return undefined;
        }
        this.stalledSamples = 0;
        if (now - this.lastRestartTime < RETRY_WINDOW_MS) {
            this.lastRestartTime = -Infinity;
            this.warmup = WARMUP_SAMPLES;
            return "give_up";
        }
        this.lastRestartTime = now;
        this.warmup = RESTART_GRACE_SAMPLES;
        return "restart";
    }
}

export const CAMERA_NO_IMAGE_TOAST_ID = "camera-no-image";

/**
 * Fed by the stats of the local camera feedback tile, like CpuLimitationDetector: no getStats() call of its own.
 *
 * Only while the camera is on: a camera the user turned off leaves its senders in place, with an active layer and
 * nothing to encode, which must not read as a frozen camera.
 */
export function startCameraStallDetector(): void {
    const detector = new CameraStallDetector();
    const cameraStatsStore = derived(
        [localEncoderStatsStore.video, effectiveCameraStateStore],
        ([$stats, $cameraOn]) => ($cameraOn ? $stats : undefined),
    );
    // Module singletons: never unsubscribed
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    effectiveCameraStateStore.subscribe((cameraOn) => {
        if (cameraOn) {
            // Back on, whichever way: the warning is moot
            toastStore.removeToast(CAMERA_NO_IMAGE_TOAST_ID);
        }
    });
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    cameraStatsStore.subscribe((stats) => {
        const action = detector.sample(stats);
        if (action === "restart") {
            console.warn("The camera has delivered no frame for 3 seconds: asking for it again");
            analyticsClient.trackAdminEvent("media.device_error", { kind: "camera", reason: "stalled" });
            restartCamera();
        } else if (action === "give_up") {
            console.warn("The camera still delivers no frame after a restart: turning it off");
            analyticsClient.trackAdminEvent("media.device_error", { kind: "camera", reason: "stalled_after_restart" });
            requestedCameraState.disableWebcam();
            toastStore.addToast(CameraNoImageToast, {}, CAMERA_NO_IMAGE_TOAST_ID);
        }
    });
}
