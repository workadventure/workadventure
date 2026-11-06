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
            // A shell of contract 1 only has notify(text).
            const wad = window.WAD;
            if (wad?.desktop && wad.notifyMessage) {
                wad.notifyMessage({ title: this.chatRoomName, body, tag: this.chatRoomId });
                return;
            }
            if (wad?.desktop) {
                wad.notify(`${this.chatRoomName} — ${body}`);
                return;
            }

            // The page-wide service worker (Network/ServiceWorker.ts) owns the "/" scope and the notificationclick
            // handler. Registering another script here would replace it.
            const registration = await navigator.serviceWorker.ready;

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
