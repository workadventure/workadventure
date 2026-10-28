/** Marks the button that opens a room from the room list (`data-room-row-button` in the markup). */
export const ROOM_ROW_BUTTON_ATTRIBUTE = "data-room-row-button";

/**
 * Arrow up/down moves the focus to the previous/next room in the list, in document order.
 * Returns whether the key was handled.
 */
export function focusAdjacentRoomRow(event: KeyboardEvent): boolean {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return false;
    }
    if (!(event.currentTarget instanceof HTMLElement)) {
        return false;
    }
    const rows = Array.from(document.querySelectorAll<HTMLElement>(`[${ROOM_ROW_BUTTON_ATTRIBUTE}]`));
    const next = rows[rows.indexOf(event.currentTarget) + (event.key === "ArrowDown" ? 1 : -1)];
    if (!next) {
        return false;
    }
    event.preventDefault();
    next.focus();
    return true;
}
