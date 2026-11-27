import { get } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { cameraListStore, microphoneListStore, silentStore } from "./MediaStore";
import { toggleCamera, toggleMicrophone } from "./HeldMediaStore";

export type MediaToggleAction = "camera" | "microphone";

/**
 * The microphone and camera buttons and their keyboard shortcuts: nothing in a silent zone or without a device,
 * otherwise the toggle of HeldMediaStore (which brings the user back from a status a click ends).
 */
export function toggleMedia(action: MediaToggleAction): void {
    const devices = get(action === "camera" ? cameraListStore : microphoneListStore);
    if (get(silentStore) || devices?.length === 0) return;
    analyticsClient.trackAdminEvent(`media.${action}.toggled`);
    if (action === "camera") toggleCamera();
    else toggleMicrophone();
}
