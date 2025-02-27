import { writable } from "svelte/store";
import HelpCameraSettingsPopup from "../Components/HelpSettings/HelpCameraSettingsPopup.svelte";
import { popupStore } from "./PopupStore";

export function showHelpCameraSettings() {
    popupStore.addPopup(HelpCameraSettingsPopup, {}, "cameraAccessDenied");
}

export function hideHelpCameraSettings() {
    popupStore.removePopup("cameraAccessDenied");
}

export const helpWebRtcSettingsVisibleStore = writable<"pending" | "error" | "hidden">("hidden");
export const helpNotificationSettingsVisibleStore = writable(false);
