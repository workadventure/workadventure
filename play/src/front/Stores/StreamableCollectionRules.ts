import { AvailabilityStatus } from "@workadventure/messages";

export const LOCAL_CAMERA_SMALL_SCREEN_WIDTH = 768;

export type LocalCameraPeerDisplayOptions = {
    hasCameraDevice: boolean;
    isCameraEnergySaving: boolean;
    isSilent: boolean;
    requestedCameraState: boolean;
    windowWidth: number;
    isMobile: boolean;
    isInActiveConversation: boolean;
    isListener: boolean;
    listenerSharingCamera: boolean;
    availabilityStatus: AvailabilityStatus;
};

export function shouldDisplayLocalCameraPeer({
    hasCameraDevice,
    isCameraEnergySaving,
    isSilent,
    requestedCameraState,
    windowWidth,
    isMobile,
    isInActiveConversation,
    isListener,
    listenerSharingCamera,
    availabilityStatus,
}: LocalCameraPeerDisplayOptions): boolean {
    if (!hasCameraDevice || isCameraEnergySaving || isSilent) {
        return false;
    }

    const isUnavailableStatus =
        availabilityStatus === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
        availabilityStatus === AvailabilityStatus.SILENT ||
        availabilityStatus === AvailabilityStatus.DO_NOT_DISTURB ||
        availabilityStatus === AvailabilityStatus.BACK_IN_A_MOMENT ||
        availabilityStatus === AvailabilityStatus.BUSY;

    if (isUnavailableStatus) {
        return false;
    }

    if (isListener && !listenerSharingCamera) {
        return false;
    }

    if ((isMobile || windowWidth < LOCAL_CAMERA_SMALL_SCREEN_WIDTH) && !isInActiveConversation) {
        return false;
    }

    if (!requestedCameraState && !isInActiveConversation) {
        return false;
    }

    return true;
}
