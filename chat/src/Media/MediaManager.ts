import { get } from "svelte/store";
import { LL } from "../i18n/i18n-svelte";
import { chatNotificationsStore, chatSoundsStore } from "../Stores/ChatStore";
import { iframeListener } from "../IframeListener";

export enum NotificationType {
    discussion = 1,
    message,
}

const TIME_NOTIFYING_MILLISECOND = 10000;

class MediaManager {
    private canSendNotification = true;
    private canPlayNotificationMessage = true;

    public hasNotification(): boolean {
        return this.canSendNotification;
    }

    public createNotification(userName: string, notificationType: NotificationType, forum: null | string) {
        if (!get(chatNotificationsStore)) {
            return;
        } else if (window.location !== window.parent.location) {
            iframeListener.sendNotificationToFront(userName, notificationType, forum);
            return;
        }

        if (this.hasNotification()) {
            const options = {
                icon: "./static/images/logo-WA-min.png",
                image: "./static/images/logo-WA-min.png",
                badge: "./static/images/logo-WA-min.png",
            };
            switch (notificationType) {
                case NotificationType.discussion:
                    new Notification(`${userName} ${get(LL).notification.discussion()}`, options);
                    break;
                case NotificationType.message:
                    new Notification(
                        `${userName} ${get(LL).notification.message()} ${
                            forum !== null && get(LL).notification.forum() + " " + forum
                        }`,
                        options
                    );
                    break;
            }

            this.canSendNotification = false;
            setTimeout(() => (this.canSendNotification = true), TIME_NOTIFYING_MILLISECOND);
        }
    }

    public playNewMessageNotification() {
        // Sounds disabled
        if (!get(chatSoundsStore)) {
            return;
        }

        //play notification message
        const elementAudioNewMessageNotification = document.getElementById("newMessageSound");
        if (
            this.canPlayNotificationMessage &&
            elementAudioNewMessageNotification &&
            elementAudioNewMessageNotification instanceof HTMLAudioElement
        ) {
            elementAudioNewMessageNotification.volume = 0.2;
            elementAudioNewMessageNotification
                .play()
                .then(() => {
                    this.canPlayNotificationMessage = false;
                    return setTimeout(() => (this.canPlayNotificationMessage = true), TIME_NOTIFYING_MILLISECOND);
                })
                .catch((err) => console.error("Trying to play notification message error: ", err));
        }
    }
}

export const mediaManager = new MediaManager();
