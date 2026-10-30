export type RoomSidePanelPlacement = "hidden" | "third-column" | "overlay";

export const CHAT_TWO_COLUMN_LAYOUT_LIMIT = 740;

// Beside the conversation, the room list is resizable within this range.
export const ROOM_LIST_DEFAULT_WIDTH = 335;
export const ROOM_LIST_MIN_WIDTH = 260;
export const ROOM_LIST_MAX_WIDTH = 400;
// Past this width, a room row shows the time and a preview of its last message.
export const ROOM_LIST_PREVIEW_MIN_WIDTH = 300;

const READABLE_CONVERSATION_WIDTH = 440;
const SIDE_PANEL_WIDTH = 360;

/** Room rows read it to know whether to show their last message: `{ shown: boolean }`. */
export const ROOM_ROW_PREVIEW_CONTEXT = Symbol("roomRowPreview");

/**
 * The room list is as wide as its column beside a conversation, or as the whole chat on its own: only that width
 * decides whether the rows have room for their last message.
 */
export function showsRoomRowPreview({
    besideConversation,
    roomListWidth,
    sideBarWidth,
}: {
    besideConversation: boolean;
    roomListWidth: number;
    sideBarWidth: number;
}): boolean {
    return (besideConversation ? roomListWidth : sideBarWidth) > ROOM_LIST_PREVIEW_MIN_WIDTH;
}

export function clampRoomListWidth(width: number): number {
    return Math.max(ROOM_LIST_MIN_WIDTH, Math.min(width, ROOM_LIST_MAX_WIDTH));
}

/**
 * Room list + a conversation that stays readable + the side panel. The widest list still fits the three of them
 * in the widest chat (1200 px).
 */
export function threeColumnLayoutLimit(roomListWidth: number): number {
    return roomListWidth + READABLE_CONVERSATION_WIDTH + SIDE_PANEL_WIDTH;
}

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
