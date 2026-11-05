import { derived, get } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
import { Room } from "../Connection/Room";
import { requestedCameraState, requestedMicrophoneState, requestedStatusStore } from "./MediaStore";
import { privacyShutdownStore } from "./PrivacyShutdownStore";
import { currentRoomStore } from "./CurrentRoomStore";

/**
 * The camera and the microphone the user wants on but away mode holds off: nobody gets them until the user comes
 * back. Each follows its own "keep active in away mode" setting. A device the user turned off is never paused,
 * and neither is anything while the user picked a status (busy, do not disturb...) that turns media off anyway.
 */
export const awayPausedMediaStore = derived(
    [privacyShutdownStore, requestedStatusStore, requestedCameraState, requestedMicrophoneState, currentRoomStore],
    ([$privacyShutdownStore, $requestedStatusStore, $requestedCameraState, $requestedMicrophoneState, $room]) => {
        const away = $privacyShutdownStore && $requestedStatusStore === null;
        return {
            camera:
                away &&
                $requestedCameraState &&
                !localUserStore.getCameraPrivacySettings(
                    $room?.defaultCameraPrivacySettings ?? Room.DEFAULT_CAMERA_PRIVACY_SETTINGS,
                ),
            microphone:
                away &&
                $requestedMicrophoneState &&
                !localUserStore.getMicrophonePrivacySettings(
                    $room?.defaultMicrophonePrivacySettings ?? Room.DEFAULT_MICROPHONE_PRIVACY_SETTINGS,
                ),
        };
    },
);

/**
 * Come back from away mode with only one device: the other one, if away mode held it, is turned off as if the
 * user had muted it, so that nothing they did not click starts.
 */
export function comeBackWith(device: "camera" | "microphone"): void {
    const paused = get(awayPausedMediaStore);
    if (device === "camera" && paused.microphone) requestedMicrophoneState.disableMicrophone();
    if (device === "microphone" && paused.camera) requestedCameraState.disableWebcam();
    privacyShutdownStore.comeBack();
}
