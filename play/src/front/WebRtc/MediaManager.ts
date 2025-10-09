import { get } from "svelte/store";
import type { UserInputManager } from "../Phaser/UserInput/UserInputManager";
import { localStreamStore } from "../Stores/MediaStore";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { showHelpCameraSettings } from "../Stores/HelpSettingsStore";
import {
    myCameraBlockedStore,
    myCameraStore,
    myMicrophoneBlockedStore,
    myMicrophoneStore,
    proximityMeetingStore,
} from "../Stores/MyMediaStore";
import { MediaStreamConstraintsError } from "../Stores/Errors/MediaStreamConstraintsError";
import { localeDetector } from "../Utils/locales";
import { notificationPlayingStore } from "../Stores/NotificationStore";
import { LL } from "../../i18n/i18n-svelte";
import infoIcon from "../Components/images/info.svg";

export type StartScreenSharingCallback = (media: MediaStream) => void;
export type StopScreenSharingCallback = (media: MediaStream) => void;

export class MediaManager {
    private userInputManager?: UserInputManager;

    constructor() {
        localeDetector()
            .catch((e) => {
                console.error("Cannot load locale on media manager", e);
            })
            .finally(() => {
                // It is ok to not unsubscribe to this store because it is a singleton.
                // eslint-disable-next-line svelte/no-ignored-unsubscribe
                localStreamStore.subscribe((result) => {
                    if (result.type === "error") {
                        if (result.error.name !== MediaStreamConstraintsError.NAME && get(myCameraStore)) {
                            showHelpCameraSettings();
                        }
                        //remove it after 10 sec
                        /*setTimeout(() => {
                            popupStore.removePopup("cameraAccessDenied");
                        }, 10000);*/
                        return;
                    }
                });

                // It is ok to not unsubscribe to this store because it is a singleton.
                // eslint-disable-next-line svelte/no-ignored-unsubscribe
                screenSharingLocalStreamStore.subscribe((result) => {
                    if (result.type === "error") {
                        console.error(result.error);
                        // showHelpCameraSettings();
                        notificationPlayingStore.playNotification(get(LL).notification.screenSharingError(), infoIcon);
                        //remove it after 10 sec
                        /*setTimeout(() => {
                            popupStore.removePopup("screenSharingAccessDenied");
                        }, 10000);*/
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
}

export const mediaManager = new MediaManager();
