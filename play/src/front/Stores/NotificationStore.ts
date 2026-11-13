import { writable } from "svelte/store";
import { v4 as uuid } from "uuid";
import { announce } from "./LiveAnnouncerStore";

export type Notification = {
    id: string;
    text: string;
    icon?: string;
};

/**
 * Store for playing notifications
 */
function createNotificationStore() {
    const { subscribe, update } = writable<Set<Notification>>(new Set());

    return {
        subscribe,
        /**
         * @param spokenText What screen readers announce, the shown text by default; false announces nothing (the
         * caller announces it itself, or something else on screen already does).
         */
        playNotification: (text: string, icon?: string, id?: string, spokenText: string | false = text) => {
            if (spokenText !== false) {
                announce(spokenText);
            }
            update((list) => {
                list.add({
                    id: id ?? uuid(),
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
        removeNotificationById(id: string) {
            update((list) => {
                const notification = Array.from(list).find((n) => n.id === id);
                if (notification) {
                    list.delete(notification);
                }
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
