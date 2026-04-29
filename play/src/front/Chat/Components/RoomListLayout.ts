export type RoomSidePanelPlacement = "hidden" | "third-column" | "timeline-column";

export function shouldShowRoomSidePanelToggle(hasCompatibleRoom: boolean) {
    return hasCompatibleRoom;
}

export function getRoomSidePanelPlacement({
    canDisplayThirdColumn,
    hasCompatibleRoom,
    isOpen,
}: {
    canDisplayThirdColumn: boolean;
    hasCompatibleRoom: boolean;
    isOpen: boolean;
}): RoomSidePanelPlacement {
    if (!hasCompatibleRoom || !isOpen) {
        return "hidden";
    }

    return canDisplayThirdColumn ? "third-column" : "timeline-column";
}

export function shouldShowRoomTimeline(roomSidePanelPlacement: RoomSidePanelPlacement) {
    return roomSidePanelPlacement !== "timeline-column";
}
