import type { ChatRoom } from "../../Chat/Connection/ChatConnection";
import { roomSidePanelStore, type RoomSidePanelSection } from "../../Chat/Stores/RoomSidePanelStore";

type NotificationTargetRoom = Pick<ChatRoom, "id">;

export function focusNotificationTarget(
    room: NotificationTargetRoom,
    messageId: string | undefined,
    sidePanelSection: RoomSidePanelSection | undefined,
): void {
    if (sidePanelSection) {
        roomSidePanelStore.setActiveSection(sidePanelSection);
        return;
    }

    focusNotificationMessage(room, messageId);
}

export function focusNotificationMessage(room: NotificationTargetRoom, messageId: string | undefined): void {
    if (!messageId) {
        return;
    }

    roomSidePanelStore.focusTimelineEvent(room.id, messageId);
}
