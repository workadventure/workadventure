import { derived, get } from "svelte/store";
import { AvailabilityStatus } from "@workadventure/messages";
import { availabilityStatusStore, requestedCameraState, requestedMicrophoneState } from "./MediaStore";
import { privacyShutdownStore } from "./PrivacyShutdownStore";
import { currentRoomStore } from "./CurrentRoomStore";
import { mediaHeldByStatus } from "./MediaHeldByStatus";

/**
 * The camera and the microphone the user wants on but their status holds off: nobody gets them until the status
 * changes. A device the user turned off is never held: it shows as off. `status` names what holds them, AWAY for
 * away mode, which the user ends with one click on a held device (see comeBackWith).
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

/**
 * Come back from away mode with one device: it is turned on, even if the user had turned it off. The other one,
 * if away mode held it, is turned off as if the user had muted it, so that nothing they did not click starts.
 */
export function comeBackWith(device: "camera" | "microphone"): void {
    const held = get(heldMediaStore);
    const away = held.status === AvailabilityStatus.AWAY;
    if (device === "camera") {
        requestedCameraState.enableWebcam();
        if (away && held.microphone) requestedMicrophoneState.disableMicrophone();
    } else {
        requestedMicrophoneState.enableMicrophone();
        if (away && held.camera) requestedCameraState.disableWebcam();
    }
    privacyShutdownStore.comeBack();
}
