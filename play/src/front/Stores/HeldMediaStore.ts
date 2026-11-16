import { derived, get } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { passStatusToOnline } from "../Rules/StatusRules/statusChangerFunctions";
import { availabilityStatusStore, requestedCameraState, requestedMicrophoneState } from "./MediaStore";
import { privacyShutdownStore } from "./PrivacyShutdownStore";
import { currentRoomStore } from "./CurrentRoomStore";
import { mediaHeldByStatus } from "./MediaHeldByStatus";

/**
 * The camera and the microphone the user wants on but their status holds off: nobody gets them until the status
 * changes. A device the user turned off is never held: it shows as off. `status` names what holds them, AWAY for
 * away mode. One click on a held device ends the holds the user can end themselves (see canComeBackFrom).
 */
export const heldMediaStore = derived(
    [availabilityStatusStore, privacyShutdownStore, requestedCameraState, requestedMicrophoneState, currentRoomStore],
    ([$availability, $privacyShutdown, $requestedCamera, $requestedMicrophone, $room]) => {
        const held = mediaHeldByStatus($availability, $privacyShutdown, $room);
        return {
            camera: $requestedCamera && held.camera,
            microphone: $requestedMicrophone && held.microphone,
            status: held.status,
        };
    },
);

// Away mode and the statuses the user picks. The others (a silent zone, an area without meetings, blocked sound) last
// as long as their cause: a click cannot end them.
const STATUSES_A_CLICK_ENDS: ReadonlySet<AvailabilityStatus> = new Set([
    AvailabilityStatus.AWAY,
    AvailabilityStatus.BUSY,
    AvailabilityStatus.BACK_IN_A_MOMENT,
    AvailabilityStatus.DO_NOT_DISTURB,
]);

/** Whether a click on a device the status holds brings the user back, available (comeBackWith). */
export function canComeBackFrom(status: AvailabilityStatus): boolean {
    return STATUSES_A_CLICK_ENDS.has(status);
}

/**
 * Come back with one device, available: away mode and the status the user picked end, and the device is turned on,
 * even if the user had turned it off. The other one, if held, is turned off as if the user had muted it, so that
 * nothing they did not click starts.
 */
export function comeBackWith(device: "camera" | "microphone"): void {
    const held = get(heldMediaStore);
    passStatusToOnline();
    privacyShutdownStore.comeBack();
    if (device === "camera") {
        requestedCameraState.enableWebcam();
        if (held.microphone) requestedMicrophoneState.disableMicrophone();
    } else {
        requestedMicrophoneState.enableMicrophone();
        if (held.camera) requestedCameraState.disableWebcam();
    }
}

/**
 * The microphone and camera buttons (the action bar, the desktop mini window and meeting bar): a device on goes off.
 * Turning one on under a status a click ends (away, busy...) brings the user back with it. Under another status (a
 * silent zone...), what the click turns on stays held, and the button of a held device does not take the click.
 */
export function toggleMicrophone(): void {
    const held = get(heldMediaStore);
    if (get(requestedMicrophoneState) && !held.microphone) requestedMicrophoneState.disableMicrophone();
    else if (canComeBackFrom(held.status)) comeBackWith("microphone");
    else requestedMicrophoneState.enableMicrophone();
}

export function toggleCamera(): void {
    const held = get(heldMediaStore);
    if (get(requestedCameraState) && !held.camera) requestedCameraState.disableWebcam();
    else if (canComeBackFrom(held.status)) comeBackWith("camera");
    else requestedCameraState.enableWebcam();
}
