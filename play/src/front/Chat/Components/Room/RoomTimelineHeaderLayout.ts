export function shouldReserveFloatingCloseButtonSpace(
    isFloatingCloseButtonVisible: boolean,
    hasRoomSidePanelToggle: boolean
) {
    return isFloatingCloseButtonVisible && hasRoomSidePanelToggle;
}
