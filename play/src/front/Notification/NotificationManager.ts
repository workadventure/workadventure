import { NotificationWA } from ".";
import { statusChanger } from "../Components/ActionBar/AvailabilityStatus/statusChanger";
import { localUserStore } from "../Connection/LocalUserStore";
import { notificationListener } from "./MessageListener";
import { TIME_NOTIFYING_MILLISECOND } from "./Notification";
 
class NotificationManager {
    private canSendNotification = true;
    private canPlayNotificationMessage = true;

    public hasNotification(): boolean {
        return (
            this.canSendNotification &&
            Notification.permission === "granted" &&
            statusChanger.allowNotificationSound() &&
            localUserStore.getNotification()
        );
    }
    
    public createNotification(notification: NotificationWA) {
        if (document.hasFocus()) {
            return;
        }

        if (this.hasNotification()) {
            console.log("send notification");
            notification.sendNotification();
        }
    }

    //TODO : voir si cette fonction est utile parce qu'on utilise souvent le playsound de gamescene directement ou la deplacer dans playsound 
    public playNewMessageNotification() {
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

    public destroy() {
        notificationListener.destroy();
    }
}

export const notificationManager = new NotificationManager();