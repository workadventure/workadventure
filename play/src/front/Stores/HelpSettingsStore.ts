import { get, writable } from "svelte/store";
import HelpCameraSettingsPopup from "../Components/HelpSettings/HelpCameraSettingsPopup.svelte";
import { mediaPermissionDeniedStore, type MediaPermissionDeniedState } from "./MediaStatusStore";
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

let previouslyDenied: MediaPermissionDeniedState = { camera: false, microphone: false };

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
mediaPermissionDeniedStore.subscribe((mediaPermissionDenied) => {
    // The store emits whenever one of its inputs changes. Only a device that just became denied opens the popup,
    // so a popup the user closed does not come back because of an unrelated change.
    const newlyDenied =
        (mediaPermissionDenied.camera && !previouslyDenied.camera) ||
        (mediaPermissionDenied.microphone && !previouslyDenied.microphone);
    previouslyDenied = mediaPermissionDenied;

    if (newlyDenied) {
        popupStore.addPopup(HelpCameraSettingsPopup, {}, HELP_CAMERA_SETTINGS_POPUP_ID);
    } else if (!mediaPermissionDenied.camera && !mediaPermissionDenied.microphone) {
        hideHelpCameraSettings();
    }
});

export const helpWebRtcSettingsVisibleStore = writable<"pending" | "error" | "hidden">("hidden");
export const helpNotificationSettingsVisibleStore = writable(false);
