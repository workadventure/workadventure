export const DESKTOP_APP_NAME = "WorkAdventure";
export const DESKTOP_WINDOW_TITLE = "WorkAdventure Desktop";

export function createDesktopWindowTitle(roomName?: string): string {
    const normalizedRoomName = typeof roomName === "string" ? roomName.trim() : "";
    if (normalizedRoomName) {
        return `${normalizedRoomName} - ${DESKTOP_APP_NAME}`;
    }

    return DESKTOP_WINDOW_TITLE;
}
