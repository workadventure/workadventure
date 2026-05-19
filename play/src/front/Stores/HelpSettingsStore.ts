import { get, writable } from "svelte/store";
import HelpCameraSettingsPopup from "../Components/HelpSettings/HelpCameraSettingsPopup.svelte";
import { mediaPermissionDeniedStore } from "./MediaStatusStore";
import { popupStore } from "./PopupStore";

const HELP_CAMERA_SETTINGS_POPUP_ID = "cameraAccessDenied";

function hasMediaPermissionDenied() {
    const mediaPermissionDenied = get(mediaPermissionDeniedStore);
    return mediaPermissionDenied.camera || mediaPermissionDenied.microphone;
}

export function showHelpCameraSettings() {
    if (!hasMediaPermissionDenied()) {
        return;
    }

    popupStore.addPopup(HelpCameraSettingsPopup, {}, HELP_CAMERA_SETTINGS_POPUP_ID);
}

export function hideHelpCameraSettings() {
    popupStore.removePopup(HELP_CAMERA_SETTINGS_POPUP_ID);
}

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
mediaPermissionDeniedStore.subscribe((mediaPermissionDenied) => {
    if (mediaPermissionDenied.camera || mediaPermissionDenied.microphone) {
        popupStore.addPopup(HelpCameraSettingsPopup, {}, HELP_CAMERA_SETTINGS_POPUP_ID);
        return;
    }

    hideHelpCameraSettings();
});

export const helpWebRtcSettingsVisibleStore = writable<"pending" | "error" | "hidden">("hidden");
export const helpNotificationSettingsVisibleStore = writable(false);
