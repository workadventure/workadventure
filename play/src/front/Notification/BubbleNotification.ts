import type { NotificationWA } from "./Notification";
import { defaultOptions, TIME_NOTIFYING_MILLISECOND } from "./Notification";

export class BubbleNotification implements NotificationWA {
    private static canSendNotification = true;
    constructor(
        private title: string,
        private options = defaultOptions,
    ) {}

    public async sendNotification() {
        if (!BubbleNotification.canSendNotification) {
            return;
        }
        // In the Electron shell, prefer the main-side notification: it pins the WA icon (the web
        // Notification path shows the browser's default), and clicking focuses the main window.
        const wad = window.WAD;
        if (wad?.desktop && wad.notify) {
            wad.notify({ title: this.title, body: "" });
        } else {
            new Notification(this.title, this.options);
        }
        BubbleNotification.canSendNotification = false;
        setTimeout(() => (BubbleNotification.canSendNotification = true), TIME_NOTIFYING_MILLISECOND);
        return Promise.resolve();
    }
}
