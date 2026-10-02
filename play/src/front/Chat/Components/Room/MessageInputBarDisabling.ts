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
