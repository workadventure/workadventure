import { get } from "svelte/store";
import { describe, expect, it } from "vitest";
import { roomSidePanelStore } from "../../Chat/Stores/RoomSidePanelStore";
import { focusNotificationTarget } from "./NotificationRoomFocus";

describe("NotificationRoomFocus", () => {
    it("should open the target side-panel section when clicking a notification with a section", () => {
        const room = createRoom();
        roomSidePanelStore.reset();

        focusNotificationTarget(room, "question-1", "questions");

        expect(get(roomSidePanelStore)).toMatchObject({ isOpen: true, activeSection: "questions" });
    });
});

function createRoom(): ChatRoom {
    return {
        id: "proximity",
    };
}

type ChatRoom = {
    id: string;
};
