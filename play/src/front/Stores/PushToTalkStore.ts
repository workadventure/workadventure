import { AvailabilityStatus } from "@workadventure/messages";

export function canStartPushToTalk({
    requestedMicrophoneState,
    isInConversationBubble,
    isInLivekit,
}: {
    requestedMicrophoneState: boolean;
    isInConversationBubble: boolean;
    isInLivekit: boolean;
}): boolean {
    return !requestedMicrophoneState && (isInConversationBubble || isInLivekit);
}

export function isUnavailableForMicrophone(availabilityStatus: AvailabilityStatus): boolean {
    return (
        availabilityStatus === AvailabilityStatus.DENY_PROXIMITY_MEETING ||
        availabilityStatus === AvailabilityStatus.SILENT ||
        availabilityStatus === AvailabilityStatus.DO_NOT_DISTURB ||
        availabilityStatus === AvailabilityStatus.BACK_IN_A_MOMENT ||
        availabilityStatus === AvailabilityStatus.BUSY
    );
}

export function shouldEnableAudioConstraint({
    requestedMicrophoneState,
    temporaryMicrophoneState,
    myMicrophone,
    isInExternalService,
    shouldDisableMicrophoneForPrivacy,
    isEnergySaving,
    availabilityStatus,
}: {
    requestedMicrophoneState: boolean;
    temporaryMicrophoneState: boolean;
    myMicrophone: boolean;
    isInExternalService: boolean;
    shouldDisableMicrophoneForPrivacy: boolean;
    isEnergySaving: boolean;
    availabilityStatus: AvailabilityStatus;
}): boolean {
    return (
        (requestedMicrophoneState || temporaryMicrophoneState) &&
        myMicrophone &&
        !isInExternalService &&
        !shouldDisableMicrophoneForPrivacy &&
        !isEnergySaving &&
        !isUnavailableForMicrophone(availabilityStatus)
    );
}

export function shouldShowMicrophoneAsEnabled({
    requestedMicrophoneState,
    temporaryMicrophoneState,
}: {
    requestedMicrophoneState: boolean;
    temporaryMicrophoneState: boolean;
}): boolean {
    return requestedMicrophoneState || temporaryMicrophoneState;
}

export function shouldIgnorePushToTalkKeyboardEvent(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable ||
        target.contentEditable === "true" ||
        target.getAttribute("contenteditable") === "true"
    );
}
