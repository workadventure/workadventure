"use strict";

const DESKTOP_APP_NAME = "WorkAdventure";
const DESKTOP_WINDOW_TITLE = "WorkAdventure Desktop";

function createDesktopWindowTitle(roomName) {
    const normalizedRoomName = typeof roomName === "string" ? roomName.trim() : "";
    if (normalizedRoomName) {
        return `${normalizedRoomName} - ${DESKTOP_APP_NAME}`;
    }

    return DESKTOP_WINDOW_TITLE;
}

module.exports = {
    DESKTOP_APP_NAME,
    DESKTOP_WINDOW_TITLE,
    createDesktopWindowTitle,
};
