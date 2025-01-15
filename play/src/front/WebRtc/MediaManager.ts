import { get } from "svelte/store";
import type { UserInputManager } from "../Phaser/UserInput/UserInputManager";
import { localStreamStore } from "../Stores/MediaStore";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { helpCameraSettingsVisibleStore } from "../Stores/HelpSettingsStore";

import {
    myCameraBlockedStore,
    myCameraStore,
    myMicrophoneBlockedStore,
    myMicrophoneStore,
    proximityMeetingStore,
} from "../Stores/MyMediaStore";
import { layoutManagerActionStore } from "../Stores/LayoutManagerStore";
import { MediaStreamConstraintsError } from "../Stores/Errors/MediaStreamConstraintsError";
import { localUserStore } from "../Connection/LocalUserStore";
import { LL } from "../../i18n/i18n-svelte";
import { localeDetector } from "../../i18n/locales";
import { statusChanger } from "../Components/ActionBar/AvailabilityStatus/statusChanger";
import { notificationListener, NotificationWA } from "../Notification";

export type StartScreenSharingCallback = (media: MediaStream) => void;
export type StopScreenSharingCallback = (media: MediaStream) => void;

//TODO add parameter to manage time to send notification
const TIME_NOTIFYING_MILLISECOND = 10000;

export class MediaManager {
    private userInputManager?: UserInputManager;
    private canSendNotification = true;
    private canPlayNotificationMessage = true;

    constructor() {
        localeDetector()
            .catch(() => {
                throw new Error("Cannot load locale on media manager");
            })
            .finally(() => {
                // It is ok to not unsubscribe to this store because it is a singleton.
                // eslint-disable-next-line svelte/no-ignored-unsubscribe
                localStreamStore.subscribe((result) => {
                    if (result.type === "error") {
                        if (result.error.name !== MediaStreamConstraintsError.NAME && get(myCameraStore)) {
                            layoutManagerActionStore.addAction({
                                uuid: "cameraAccessDenied",
                                type: "warning",
                                message: get(LL).warning.accessDenied.camera(),
                                callback: () => {
                                    helpCameraSettingsVisibleStore.set(true);
                                },
                                userInputManager: this.userInputManager,
                            });
                        }
                        //remove it after 10 sec
                        setTimeout(() => {
                            layoutManagerActionStore.removeAction("cameraAccessDenied");
                        }, 10000);
                        return;
                    }
                });

                // It is ok to not unsubscribe to this store because it is a singleton.
                // eslint-disable-next-line svelte/no-ignored-unsubscribe
                screenSharingLocalStreamStore.subscribe((result) => {
                    if (result.type === "error") {
                        console.error(result.error);
                        layoutManagerActionStore.addAction({
                            uuid: "screenSharingAccessDenied",
                            type: "warning",
                            message: get(LL).warning.accessDenied.screenSharing(),
                            callback: () => {
                                helpCameraSettingsVisibleStore.set(true);
                            },
                            userInputManager: this.userInputManager,
                        });
                        //remove it after 10 sec
                        setTimeout(() => {
                            layoutManagerActionStore.removeAction("screenSharingAccessDenied");
                        }, 10000);
                        return;
                    }
                });
            });
    }

    public enableMyCamera(): void {
        if (!get(myCameraBlockedStore)) {
            myCameraStore.set(true);
        }
    }

    public disableMyCamera(): void {
        myCameraStore.set(false);
    }

    public enableMyMicrophone(): void {
        if (!get(myMicrophoneBlockedStore)) {
            myMicrophoneStore.set(true);
        }
    }

    public disableMyMicrophone(): void {
        myMicrophoneStore.set(false);
    }

    public enableProximityMeeting(): void {
        proximityMeetingStore.set(true);
    }

    public disableProximityMeeting(): void {
        proximityMeetingStore.set(false);
    }

    public setUserInputManager(userInputManager: UserInputManager) {
        this.userInputManager = userInputManager;
    }

    public hasNotification(): boolean {
        return (
            this.canSendNotification &&
            Notification.permission === "granted" &&
            statusChanger.allowNotificationSound() &&
            localUserStore.getNotification()
        );
    }

    public destroy() {
        notificationListener.destroy();
    }

    public createNotification(notification: NotificationWA) {
        if (document.hasFocus()) {
            return;
        }

        if (this.hasNotification()) {
            notification.sendNotification();
            //TODO : voir si on applique la regle du time_notifying_millisecond sinon deplacer la logique dans chaque classe
            //TODO : peut etre avoir 2 classe generique une qui avec time_notifying_millisecond et une qui n'en a pas

            this.canSendNotification = false;
            setTimeout(() => (this.canSendNotification = true), TIME_NOTIFYING_MILLISECOND);
        }
    }

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
}

export const mediaManager = new MediaManager();