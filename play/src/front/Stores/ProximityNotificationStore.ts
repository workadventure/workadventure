import { writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";
import type { ChatRoom } from "../Chat/Connection/ChatConnection";

export interface ProximityNotification {
    id: string;
    userName: string;
    message: string;
    messageId?: string;
    room: ChatRoom;
    /** When false, click only opens the chat panel (e.g. for room invitations). Default true. */
    openRoomOnClick?: boolean;
}

/**
 * Store for chat notifications (proximity and matrix rooms)
 */
function createChatNotificationStore() {
    const { subscribe, update } = writable<ProximityNotification[]>([]);

    return {
        subscribe,
        addNotification: (
            userName: string,
            message: string,
            room: ChatRoom,
            messageId?: string,
            openRoomOnClick = true
        ): string => {
            const id = uuidv4();
            update((notifications: ProximityNotification[]) => {
                // If messageId exists, remove the existing notification to add it at the end
                const filteredNotifications = messageId
                    ? notifications.filter((n) => n.messageId !== messageId)
                    : notifications;
                return [...filteredNotifications, { id, userName, message, messageId, room, openRoomOnClick }];
            });
            return id;
        },
        removeNotification: (id: string): void => {
            update((notifications: ProximityNotification[]) => {
                return notifications.filter((notification) => notification.id !== id);
            });
        },
        clearAll: (): void => {
            update(() => []);
        },
    };
}

export const chatNotificationStore = createChatNotificationStore();
