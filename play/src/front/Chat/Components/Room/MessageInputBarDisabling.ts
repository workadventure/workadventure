export function shouldDisableMessageInput({
    disabled,
    isProximityChatRoom,
    isProximityChatDisabled,
    isProximityRoomJoined,
}: {
    disabled: boolean;
    isProximityChatRoom: boolean;
    isProximityChatDisabled: boolean;
    isProximityRoomJoined: boolean;
}): boolean {
    if (!isProximityChatRoom) {
        return disabled;
    }

    // Out of the bubble (the default proximity room included) there is nobody to receive a message:
    // a message typed there would show as sent and reach no one.
    return isProximityChatDisabled || !isProximityRoomJoined;
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
