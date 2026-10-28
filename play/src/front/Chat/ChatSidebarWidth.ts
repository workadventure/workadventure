import { CHAT_TWO_COLUMN_LAYOUT_LIMIT } from "./Components/RoomListLayout";

// Below this width the timeline bubbles overflow the panel.
export const CHAT_SIDEBAR_MIN_WIDTH = 320;
// Wider than this, lines get too long to read and the map disappears behind the chat.
export const CHAT_SIDEBAR_MAX_WIDTH = 1200;
// A released width closer than this to a step lands on the step.
export const CHAT_SIDEBAR_SNAP_DISTANCE = 40;
// On a narrower screen, a strip of the map stays visible so the handle can be grabbed back.
const VIEWPORT_MARGIN = 50;

export function getChatSidebarMaxWidth(viewportWidth: number): number {
    return Math.min(CHAT_SIDEBAR_MAX_WIDTH, viewportWidth - VIEWPORT_MARGIN);
}

export function clampChatSidebarWidth(width: number, viewportWidth: number): number {
    return Math.max(CHAT_SIDEBAR_MIN_WIDTH, Math.min(width, getChatSidebarMaxWidth(viewportWidth)));
}

/**
 * Width to keep once a drag is released: the maximum width near it, the two-column layout near its limit,
 * the dragged width otherwise.
 */
export function snapChatSidebarWidth(width: number, viewportWidth: number): number {
    const maxWidth = getChatSidebarMaxWidth(viewportWidth);
    const clampedWidth = clampChatSidebarWidth(width, viewportWidth);
    if (maxWidth - clampedWidth <= CHAT_SIDEBAR_SNAP_DISTANCE) {
        return maxWidth;
    }
    if (Math.abs(clampedWidth - CHAT_TWO_COLUMN_LAYOUT_LIMIT) <= CHAT_SIDEBAR_SNAP_DISTANCE) {
        return CHAT_TWO_COLUMN_LAYOUT_LIMIT;
    }
    return clampedWidth;
}
