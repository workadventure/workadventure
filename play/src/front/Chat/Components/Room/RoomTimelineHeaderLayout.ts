export function shouldReserveFloatingCloseButtonSpace(
    isFloatingCloseButtonVisible: boolean,
    hasRoomSidePanelToggle: boolean,
    roomSidePanelToggleIsOpen: boolean,
) {
    return isFloatingCloseButtonVisible && hasRoomSidePanelToggle && !roomSidePanelToggleIsOpen;
}

/** The back arrow leads to the room list: hide it while that list is already on screen beside the timeline. */
export function shouldShowBackToRoomList(roomListVisible: boolean, isThread: boolean, hasBackAction: boolean) {
    return !roomListVisible || isThread || hasBackAction;
}
