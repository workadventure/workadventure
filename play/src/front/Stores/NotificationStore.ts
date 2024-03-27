import { writable } from "svelte/store";

export type Notification = {
    id: string;
    text: string;
    icon: string;
};

/**
 * Store for playing notifications
 */
function createNotificationStore() {
    const { subscribe, update } = writable<Set<Notification>>(new Set());

    return {
        subscribe,
        playNotification: (text: string, icon: string) => {
            update((list) => {
                list.add({
                    id: crypto.randomUUID(),
                    text,
                    icon,
                });
                return list;
            });
        },
        removeNotification(notification: Notification) {
            update((list) => {
                list.delete(notification);
                return list;
            });
        },
        clearAllNotification: () => {
            update((list) => {
                list.clear();
                return list;
            });
        },
    };
}

export const notificationPlayingStore = createNotificationStore();
