import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import LL from "../../i18n/i18n-svelte";
import { defaultOptions, NotificationWA } from "./Notification";
export class MessageNotification implements NotificationWA {
    constructor(
        private userName: string,
        private message: string,
        private chatRoomId: string,
        private chatRoomName: string,
        private options = defaultOptions
    ) {}

    public async sendNotification() {
        try {
            const registration = await navigator.serviceWorker.register("/notification-service-worker.js");

            const numberOfChar = 60;
            const messageToDisplay =
                this.message.length > numberOfChar ? this.message.slice(0, numberOfChar) + "..." : this.message;
            const body = `${get(LL).notification.message({ name: this.userName })} : ${messageToDisplay}`;

            const data = {
                chatRoomId: this.chatRoomId,
                tabUrl: window.location.href,
            };

            await registration.showNotification(this.chatRoomName, {
                ...this.options,
                body,
                data,
            });
        } catch (error) {
            console.error("Error while sending message notification", error);
            Sentry.captureException(error);
        }
    }
}
