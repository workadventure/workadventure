import { defaultOptions, NotificationWA } from "./Notification";

export class BasicNotification implements NotificationWA {

    constructor(private title: string, private options = defaultOptions) {}

    public sendNotification() {
        new Notification(this.title, this.options);
    }
}