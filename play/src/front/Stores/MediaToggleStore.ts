import { AvailabilityStatus } from "@workadventure/messages";
import { derived, get } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";
import {
    availabilityStatusStore,
    cameraListStore,
    requestedCameraState,
    requestedMicrophoneState,
    microphoneListStore,
    silentStore,
} from "./MediaStore";

export type MediaToggleAction = "camera" | "microphone";

function isStatusBlocked(status: AvailabilityStatus): boolean {
    return [
        AvailabilityStatus.BUSY,
        AvailabilityStatus.AWAY,
        AvailabilityStatus.BACK_IN_A_MOMENT,
        AvailabilityStatus.SOUND_BLOCKED,
        AvailabilityStatus.DO_NOT_DISTURB,
    ].includes(status);
}

// Created lazily: this module is reachable from MediaStore through a circular import chain,
// so MediaStore's exports may still be undefined when this module is evaluated.
export function createMediaToggleStatusBlockedStore() {
    return derived(availabilityStatusStore, (status) => isStatusBlocked(status));
}

export function isMediaDeviceListAvailable(deviceList: readonly unknown[] | undefined): boolean {
    return deviceList === undefined || deviceList.length > 0;
}

export function createMediaToggleAvailableStore(action: MediaToggleAction) {
    const deviceListStore = action === "camera" ? cameraListStore : microphoneListStore;
    return derived(
        [createMediaToggleStatusBlockedStore(), silentStore, deviceListStore],
        ([statusBlocked, silent, deviceList]) => !silent && !statusBlocked && isMediaDeviceListAvailable(deviceList),
    );
}

export function isMediaToggleAvailable(action: MediaToggleAction): boolean {
    const deviceList = get(action === "camera" ? cameraListStore : microphoneListStore);
    return (
        !get(silentStore) && !isStatusBlocked(get(availabilityStatusStore)) && isMediaDeviceListAvailable(deviceList)
    );
}

export function toggleMedia(action: MediaToggleAction): void {
    if (!isMediaToggleAvailable(action)) return;
    analyticsClient.trackAdminEvent(`media.${action}.toggled`);
    if (action === "camera") {
        if (get(requestedCameraState)) {
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    } else {
        if (get(requestedMicrophoneState)) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    }
}
