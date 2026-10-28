import { CHAT_TWO_COLUMN_LAYOUT_LIMIT } from "./Components/RoomListLayout";

// Below this width the timeline bubbles overflow the panel.
export const CHAT_SIDEBAR_MIN_WIDTH = 320;
// A released width closer than this to a step lands on the step.
export const CHAT_SIDEBAR_SNAP_DISTANCE = 40;
// While dragging, a strip of the map stays visible so the handle can be grabbed back.
const DRAG_MAX_MARGIN = 50;

// Past this width the chat only adds empty space beside the conversation: it stops here and the map stays visible.
// 335 px of room list + a ~865 px conversation, wide enough for the reading column and the three-column layout.
export const CHAT_SIDEBAR_MAX_WIDTH = 1200;

export function clampChatSidebarWidth(width: number, viewportWidth: number): number {
    return Math.max(CHAT_SIDEBAR_MIN_WIDTH, Math.min(width, viewportWidth - DRAG_MAX_MARGIN, CHAT_SIDEBAR_MAX_WIDTH));
}

/** The widest the chat goes: the whole window on a screen that is not much wider than the cap, the cap otherwise. */
export function maxChatSidebarWidth(viewportWidth: number): number {
    return viewportWidth - DRAG_MAX_MARGIN <= CHAT_SIDEBAR_MAX_WIDTH ? viewportWidth : CHAT_SIDEBAR_MAX_WIDTH;
}

/**
 * Width to keep once a drag is released: the widest width near the top of the range, the two-column layout near its
 * limit, the dragged width otherwise.
 */
export function snapChatSidebarWidth(width: number, viewportWidth: number): number {
    const clampedWidth = clampChatSidebarWidth(width, viewportWidth);
    if (clampChatSidebarWidth(Infinity, viewportWidth) - clampedWidth <= CHAT_SIDEBAR_SNAP_DISTANCE) {
        return maxChatSidebarWidth(viewportWidth);
    }
    if (Math.abs(clampedWidth - CHAT_TWO_COLUMN_LAYOUT_LIMIT) <= CHAT_SIDEBAR_SNAP_DISTANCE) {
        return CHAT_TWO_COLUMN_LAYOUT_LIMIT;
    }
    return clampedWidth;
}
