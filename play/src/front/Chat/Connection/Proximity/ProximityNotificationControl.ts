import type { Writable } from "svelte/store";

export function muteProximityChatNotifications(areNotificationsMuted: Writable<boolean>): Promise<void> {
    areNotificationsMuted.set(true);
    return Promise.resolve();
}

export function unmuteProximityChatNotifications(areNotificationsMuted: Writable<boolean>): Promise<void> {
    areNotificationsMuted.set(false);
    return Promise.resolve();
}
