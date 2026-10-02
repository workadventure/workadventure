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
