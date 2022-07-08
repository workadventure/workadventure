
export enum NotificationType {
    discussion = 1,
    message,
}

const TIME_NOTIFYING_MILLISECOND = 10000;

class MediaManager{

    private canSendNotification = true;
    private canPlayNotificationMessage = true;

    public hasNotification(): boolean {
        if (this.canSendNotification && Notification.permission === "granted") {
            return localUserStore.getNotification() === "granted";
        } else {
            return false;
        }
    }

    public createNotification(userName: string, notificationType: NotificationType) {
        if (document.hasFocus()) {
            return;
        }

        if (this.hasNotification()) {
            const options = {
                icon: "/resources/logos/logo-WA-min.png",
                image: "/resources/logos/logo-WA-min.png",
                badge: "/resources/logos/logo-WA-min.png",
            };
            switch (notificationType) {
                case NotificationType.discussion:
                    new Notification(`${userName} ${get(LL).notification.discussion()}`, options);
                    break;
                case NotificationType.message:
                    new Notification(`${userName} ${get(LL).notification.message()}`, options);
                    break;
            }
            this.canSendNotification = false;
            setTimeout(() => (this.canSendNotification = true), TIME_NOTIFYING_MILLISECOND);
        }
    }

    public playNewMessageNotification() {
        //play notification message
        const elementAudioNewMessageNotification = document.getElementById("newMessageSound");
        if (this.canPlayNotificationMessage && elementAudioNewMessageNotification) {
            (elementAudioNewMessageNotification as HTMLAudioElement).volume = 0.2;
            (elementAudioNewMessageNotification as HTMLAudioElement)
                .play()
                .then(() => {
                    console.log("elementAudioNewMessageNotification => played");
                    this.canPlayNotificationMessage = false;
                    return setTimeout(() => (this.canPlayNotificationMessage = true), TIME_NOTIFYING_MILLISECOND);
                })
                .catch((err) => console.error("Trying to play notification message error: ", err));
        }
    }

}

const export mediaManager = new MediaManager();
