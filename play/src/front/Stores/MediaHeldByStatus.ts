import { AvailabilityStatus } from "@workadventure/messages";
import { localUserStore } from "../Connection/LocalUserStore";
import { Room } from "../Connection/Room";

// Statuses that turn both the camera and the microphone off.
const MEDIA_CUTTING_STATUSES: ReadonlySet<AvailabilityStatus> = new Set([
    AvailabilityStatus.DENY_PROXIMITY_MEETING,
    AvailabilityStatus.SILENT,
    AvailabilityStatus.DO_NOT_DISTURB,
    AvailabilityStatus.BACK_IN_A_MOMENT,
    AvailabilityStatus.SOUND_BLOCKED,
    AvailabilityStatus.BUSY,
]);

export type MediaHeldByStatus = {
    camera: boolean;
    microphone: boolean;
    /** The status that holds them: one the user is in (busy, a silent zone...), or AWAY for away mode. */
    status: AvailabilityStatus;
};

/**
 * Which devices the user's status turns off. A status like busy turns off both; away mode turns off each device
 * its "keep active in away mode" setting does not keep. The camera and microphone, and their buttons, follow it.
 */
export function mediaHeldByStatus(
    availability: AvailabilityStatus,
    privacyShutdown: boolean,
    room: Room | undefined,
): MediaHeldByStatus {
    if (MEDIA_CUTTING_STATUSES.has(availability)) return { camera: true, microphone: true, status: availability };
    if (!privacyShutdown) return { camera: false, microphone: false, status: availability };
    return {
        camera: !localUserStore.getCameraPrivacySettings(
            room?.defaultCameraPrivacySettings ?? Room.DEFAULT_CAMERA_PRIVACY_SETTINGS,
        ),
        microphone: !localUserStore.getMicrophonePrivacySettings(
            room?.defaultMicrophonePrivacySettings ?? Room.DEFAULT_MICROPHONE_PRIVACY_SETTINGS,
        ),
        status: AvailabilityStatus.AWAY,
    };
}
