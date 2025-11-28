import { writable } from "svelte/store";
import { v4 as uuidv4 } from "uuid";

export interface ProximityNotification {
    id: string;
    userName: string;
    message: string;
    messageId?: string;
}

/**
 * Store for proximity chat notifications
 */
function createProximityNotificationStore() {
    const { subscribe, update } = writable<ProximityNotification[]>([]);

    return {
        subscribe,
        addNotification: (userName: string, message: string, messageId?: string): string => {
            const id = uuidv4();
            update((notifications: ProximityNotification[]) => {
                return [...notifications, { id, userName, message, messageId }];
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

export const proximityNotificationStore = createProximityNotificationStore();
