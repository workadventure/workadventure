import type { NotificationWA } from "./Notification.ts";
import { defaultOptions, TIME_NOTIFYING_MILLISECOND } from "./Notification.ts";

export class BubbleNotification implements NotificationWA {
    private static canSendNotification = true;
    constructor(private title: string, private options = defaultOptions) {}

    public async sendNotification() {
        if (BubbleNotification.canSendNotification) {
            new Notification(this.title, this.options);
            BubbleNotification.canSendNotification = false;
            setTimeout(() => (BubbleNotification.canSendNotification = true), TIME_NOTIFYING_MILLISECOND);
        }
        return Promise.resolve();
    }
}
