import path from "path";
import { Notification, NotificationConstructorOptions } from "electron";

export function createNotification(options: Partial<NotificationConstructorOptions>) {
    const notification = new Notification({
        title: "WorkAdventure",
        icon: path.join(__dirname, "..", "assets", "icons", "logo.png"),
        ...(options || {}),
    });

    return notification;
}

export function createAndShowNotification(options: Partial<NotificationConstructorOptions>) {
    const notification = createNotification(options);

    notification.show();

    return notification;
}
