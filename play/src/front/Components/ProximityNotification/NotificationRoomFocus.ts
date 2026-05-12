import type { ChatRoom } from "../../Chat/Connection/ChatConnection";
import { roomSidePanelStore } from "../../Chat/Stores/RoomSidePanelStore";

export function focusNotificationMessage(room: ChatRoom, messageId: string | undefined): void {
    if (!messageId) {
        return;
    }

    roomSidePanelStore.focusTimelineEvent(room.id, messageId);
}
