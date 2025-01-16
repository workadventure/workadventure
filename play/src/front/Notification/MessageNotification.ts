import { get } from "svelte/store";
import LL from "../../i18n/i18n-svelte";
import { defaultOptions, NotificationWA } from "./Notification";

export class MessageNotification implements NotificationWA {
    constructor(private title: string, private userName: string, private message: string, private chatRoomId: string, private chatRoomName: string, private options = defaultOptions) {
    }

    public sendNotification() {
        navigator.serviceWorker.register("/notification-service-worker.js").then((registration) => {
            //TODO : revoir le nombre de caractere a afficher
            const numberOfChar = 60;
            const messageToDisplay = this.message.length > numberOfChar ? this.message.slice(0, numberOfChar) + '...' : this.message;
            const body = `${this.userName} ${get(LL).notification.message()} : ${messageToDisplay}`;

            const data = {  
                chatRoomId : this.chatRoomId,
                chatRoomName : this.chatRoomName,
                tabUrl: window.location.href
            }

            registration.showNotification(this.chatRoomName, {
                ...this.options,
                body,
                data,
            });
        });
    }
}