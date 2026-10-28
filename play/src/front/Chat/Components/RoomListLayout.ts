export type RoomSidePanelPlacement = "hidden" | "third-column" | "overlay";

export const CHAT_TWO_COLUMN_LAYOUT_LIMIT = 740;

/** Room list (335px) + a conversation that stays readable (480px) + the side panel (360px). */
export const CHAT_THREE_COLUMN_LAYOUT_LIMIT = 335 + 480 + 360;

export function canDisplayRoomListAndTimeline({
    minimumTwoColumnWidth,
    sideBarWidth,
}: {
    minimumTwoColumnWidth: number;
    sideBarWidth: number;
}) {
    return sideBarWidth >= minimumTwoColumnWidth;
}

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

    return canDisplayThirdColumn ? "third-column" : "overlay";
}
