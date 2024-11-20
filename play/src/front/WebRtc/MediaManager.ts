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
import { MediaStreamConstraintsError } from "../Stores/Errors/MediaStreamConstraintsError";
import { localUserStore } from "../Connection/LocalUserStore";
import { LL } from "../../i18n/i18n-svelte";
import { localeDetector } from "../../i18n/locales";
import { popupStore } from "../Stores/PopupStore";
import PopUpCameraAccesDenied from "../Components/PopUp/PopUpCameraAccesDenied.svelte";
import PopUpSharingScreenAcessDenied from "../Components/PopUp/PopUpSharingScreenAcessDenied.svelte";

export type StartScreenSharingCallback = (media: MediaStream) => void;
export type StopScreenSharingCallback = (media: MediaStream) => void;

export enum NotificationType {
    discussion = 1,
    message,
}

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
                            popupStore.addPopup(
                                PopUpCameraAccesDenied,
                                {
                                    message: get(LL).warning.accessDenied.camera(),
                                    click: () => {
                                        helpCameraSettingsVisibleStore.set(true);
                                        popupStore.removePopup("cameraAccessDenied");
                                    },
                                    userInputManager: this.userInputManager,
                                },
                                "cameraAccessDenied"
                            );
                        }
                        //remove it after 10 sec
                        setTimeout(() => {
                            popupStore.removePopup("cameraAccessDenied");
                        }, 10000);
                        return;
                    }
                });

                // It is ok to not unsubscribe to this store because it is a singleton.
                // eslint-disable-next-line svelte/no-ignored-unsubscribe
                screenSharingLocalStreamStore.subscribe((result) => {
                    if (result.type === "error") {
                        console.error(result.error);
                        popupStore.addPopup(
                            PopUpSharingScreenAcessDenied,
                            {
                                message: get(LL).warning.accessDenied.screenSharing(),
                                click: () => {
                                    helpCameraSettingsVisibleStore.set(true);
                                    popupStore.removePopup("screenSharingAccessDenied");
                                },
                                userInputManager: this.userInputManager,
                            },
                            "screenSharingAccessDenied"
                        );
                        //remove it after 10 sec
                        setTimeout(() => {
                            popupStore.removePopup("screenSharingAccessDenied");
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
        if (this.canSendNotification && Notification.permission === "granted") {
            return localUserStore.getNotification();
        } else {
            return false;
        }
    }

    public createNotification(userName: string, notificationType: NotificationType, chatRoom: string | null = null) {
        if (document.hasFocus()) {
            return;
        }

        if (this.hasNotification()) {
            const options = {
                icon: "/static/images/logo-WA-min.png",
                image: "/static/images/logo-WA-min.png",
                badge: "/static/images/logo-WA-min.png",
            };
            switch (notificationType) {
                case NotificationType.discussion:
                    new Notification(`${userName} ${get(LL).notification.discussion()}`, options);
                    break;
                case NotificationType.message:
                    new Notification(
                        `${userName} ${get(LL).notification.message()} ${
                            chatRoom !== null && get(LL).notification.chatRoom() + " " + chatRoom
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
