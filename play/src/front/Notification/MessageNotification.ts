import { get } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import LL from "../../i18n/i18n-svelte";
import type { NotificationWA } from "./Notification";
import { defaultOptions } from "./Notification";
export class MessageNotification implements NotificationWA {
    constructor(
        private userName: string,
        private message: string,
        private chatRoomId: string,
        private chatRoomName: string,
        private isMention = false,
        private options = defaultOptions,
    ) {}

    public async sendNotification() {
        try {
            // The page-wide service worker (Network/ServiceWorker.ts) owns the "/" scope and the notificationclick
            // handler. Registering another script here would replace it.
            const registration = await navigator.serviceWorker.ready;

            const numberOfChar = 60;
            const messageToDisplay =
                this.message.length > numberOfChar ? this.message.slice(0, numberOfChar) + "..." : this.message;
            const title = this.isMention
                ? get(LL).notification.mention({ name: this.userName })
                : get(LL).notification.message({ name: this.userName });
            const body = `${title} : ${messageToDisplay}`;

            const data = {
                chatRoomId: this.chatRoomId,
                tabUrl: window.location.href,
            };

            await registration.showNotification(this.chatRoomName, {
                ...this.options,
                body,
                data,
                // One notification per conversation: the next message replaces it instead of piling up.
                tag: this.chatRoomId,
            });
        } catch (error) {
            console.error("Error while sending message notification", error);
            Sentry.captureException(error);
        }
    }
}
