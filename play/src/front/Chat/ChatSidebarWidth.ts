import { CHAT_TWO_COLUMN_LAYOUT_LIMIT } from "./Components/RoomListLayout";

// Below this width the timeline bubbles overflow the panel.
export const CHAT_SIDEBAR_MIN_WIDTH = 320;
// A released width closer than this to a step lands on the step.
export const CHAT_SIDEBAR_SNAP_DISTANCE = 40;
// While dragging, a strip of the map stays visible so the handle can be grabbed back.
const DRAG_MAX_MARGIN = 50;

export function clampChatSidebarWidth(width: number, viewportWidth: number): number {
    return Math.max(CHAT_SIDEBAR_MIN_WIDTH, Math.min(width, viewportWidth - DRAG_MAX_MARGIN));
}

/**
 * Width to keep once a drag is released: full screen near the right edge, the two-column layout near its limit,
 * the dragged width otherwise.
 */
export function snapChatSidebarWidth(width: number, viewportWidth: number): number {
    const clampedWidth = clampChatSidebarWidth(width, viewportWidth);
    if (viewportWidth - DRAG_MAX_MARGIN - clampedWidth <= CHAT_SIDEBAR_SNAP_DISTANCE) {
        return viewportWidth;
    }
    if (Math.abs(clampedWidth - CHAT_TWO_COLUMN_LAYOUT_LIMIT) <= CHAT_SIDEBAR_SNAP_DISTANCE) {
        return CHAT_TWO_COLUMN_LAYOUT_LIMIT;
    }
    return clampedWidth;
}
