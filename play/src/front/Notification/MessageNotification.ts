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
        private options = defaultOptions,
    ) {}

    public async sendNotification() {
        try {
            const numberOfChar = 60;
            const messageToDisplay =
                this.message.length > numberOfChar ? this.message.slice(0, numberOfChar) + "..." : this.message;
            const body = `${get(LL).notification.message({ name: this.userName })} : ${messageToDisplay}`;

            // In the Electron shell, route through the main-process notification: the WA icon is
            // pinned, and the chatRoomId travels as `tag` so a click can focus the app and open
            // the originating room. The service-worker path is web-only.
            const wad = window.WAD;
            if (wad?.desktop && wad.notify) {
                wad.notify({ title: this.chatRoomName, body, tag: this.chatRoomId });
                return;
            }

            const registration = await navigator.serviceWorker.register("/notification-service-worker.js");

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
