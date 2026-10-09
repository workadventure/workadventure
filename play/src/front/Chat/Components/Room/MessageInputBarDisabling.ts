export function shouldDisableMessageInput({
    disabled,
    isProximityChatRoom,
    isDefaultProximityRoom,
    isProximityChatDisabled,
    isProximityRoomJoined,
}: {
    disabled: boolean;
    isProximityChatRoom: boolean;
    isDefaultProximityRoom: boolean;
    isProximityChatDisabled: boolean;
    isProximityRoomJoined: boolean;
}): boolean {
    if (!isProximityChatRoom) {
        return disabled;
    }

    return isProximityChatDisabled || (!isDefaultProximityRoom && !isProximityRoomJoined);
}

export function shouldDisableSendButton({
    applicationPropertyInProcessing,
    isMessageInputDisabled,
}: {
    applicationPropertyInProcessing: boolean;
    isMessageInputDisabled: boolean;
}): boolean {
    return applicationPropertyInProcessing || isMessageInputDisabled;
}

/**
 * Files can be attached (with the File attachment button, drag and drop or paste) only where the button is enabled:
 * uploads allowed by the admin, not in a proximity chat, and the user may send messages.
 */
export function canAttachFiles({
    isUploadEnabled,
    isProximityChatRoom,
    canSendMessages,
}: {
    isUploadEnabled: boolean;
    isProximityChatRoom: boolean;
    canSendMessages: boolean;
}): boolean {
    return isUploadEnabled && !isProximityChatRoom && canSendMessages;
}
