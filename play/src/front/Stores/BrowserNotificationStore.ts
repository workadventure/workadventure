import { writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";

function getBrowserNotificationsEnabled(): boolean {
    return (
        typeof Notification !== "undefined" && Notification.permission === "granted" && localUserStore.getNotification()
    );
}

export function createBrowserNotificationStore() {
    const { subscribe, set } = writable(getBrowserNotificationsEnabled());

    return {
        subscribe,
        refresh(): void {
            set(getBrowserNotificationsEnabled());
        },
    };
}

export const browserNotificationStore = createBrowserNotificationStore();

/**
 * Offers browser notifications in the chat after a message was missed in a hidden tab, rather than on page load.
 * Only while the browser has not been asked yet and the offer was not declined.
 */
export const notificationPromptStore = writable(false);

export function offerBrowserNotifications(): void {
    if (
        typeof Notification !== "undefined" &&
        Notification.permission === "default" &&
        !localUserStore.getNotificationPromptDismissed()
    ) {
        notificationPromptStore.set(true);
    }
}
