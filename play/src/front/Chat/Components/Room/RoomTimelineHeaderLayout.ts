export function shouldReserveFloatingCloseButtonSpace(
    isFloatingCloseButtonVisible: boolean,
    hasRoomSidePanelToggle: boolean,
    roomSidePanelToggleIsOpen: boolean,
) {
    return isFloatingCloseButtonVisible && hasRoomSidePanelToggle && !roomSidePanelToggleIsOpen;
}
