import { HtmlUtils } from "./HtmlUtils";
import type { UserInputManager } from "../Phaser/UserInput/UserInputManager";
import { localStreamStore } from "../Stores/MediaStore";
import { screenSharingLocalStreamStore } from "../Stores/ScreenSharingStore";
import { helpCameraSettingsVisibleStore } from "../Stores/HelpSettingsStore";

export type StartScreenSharingCallback = (media: MediaStream) => void;
export type StopScreenSharingCallback = (media: MediaStream) => void;

import {
    myCameraBlockedStore,
    myCameraStore,
    myMicrophoneBlockedStore,
    myMicrophoneStore,
    proximityMeetingStore,
} from "../Stores/MyMediaStore";
import { layoutManagerActionStore } from "../Stores/LayoutManagerStore";
import { MediaStreamConstraintsError } from "../Stores/Errors/MediaStreamConstraintsError";
import { localUserStore } from "../Connexion/LocalUserStore";
import LL from "../../i18n/i18n-svelte";
import { get } from "svelte/store";
import { localeDetector } from "../../i18n/locales";

export enum NotificationType {
    discussion = 1,
    message,
}

//TODO add parameter to manage time to send notification
const TIME_NOTIFYING_MILLISECOND = 10000;

export class MediaManager {
    startScreenSharingCallBacks: Set<StartScreenSharingCallback> = new Set<StartScreenSharingCallback>();
    stopScreenSharingCallBacks: Set<StopScreenSharingCallback> = new Set<StopScreenSharingCallback>();

    private userInputManager?: UserInputManager;

    private canSendNotification = true;
    private canPlayNotificationMessage = true;

    constructor() {
        localeDetector()
            .catch(() => {
                throw new Error("Cannot load locale on media manager");
            })
            .finally(() => {
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

    private getScreenSharingId(userId: string): string {
        return `screen-sharing-${userId}`;
    }

    disabledMicrophoneByUserId(userId: number) {
        const element = document.getElementById(`microphone-${userId}`);
        if (!element) {
            return;
        }
        element.classList.add("active"); //todo: why does a method 'disable' add a class 'active'?
    }

    enabledMicrophoneByUserId(userId: number) {
        const element = document.getElementById(`microphone-${userId}`);
        if (!element) {
            return;
        }
        element.classList.remove("active"); //todo: why does a method 'enable' remove a class 'active'?
    }

    disabledVideoByUserId(userId: number) {
        let element = document.getElementById(`${userId}`);
        if (element) {
            element.style.opacity = "0";
        }
        element = document.getElementById(`name-${userId}`);
        if (element) {
            element.style.display = "block";
        }
    }

    enabledVideoByUserId(userId: number) {
        let element = document.getElementById(`${userId}`);
        if (element) {
            element.style.opacity = "1";
        }
        element = document.getElementById(`name-${userId}`);
        if (element) {
            element.style.display = "none";
        }
    }

    toggleBlockLogo(userId: number, show: boolean): void {
        const blockLogoElement = HtmlUtils.getElementByIdOrFail<HTMLImageElement>("blocking-" + userId);
        show ? blockLogoElement.classList.add("active") : blockLogoElement.classList.remove("active");
    }

    isError(userId: string): void {
        console.info("isError", `div-${userId}`);
        const element = document.getElementById(`div-${userId}`);
        if (!element) {
            return;
        }
        const errorDiv = element.getElementsByClassName("rtc-error").item(0) as HTMLDivElement | null;
        if (errorDiv === null) {
            return;
        }
        errorDiv.style.display = "block";
    }
    isErrorScreenSharing(userId: string): void {
        this.isError(this.getScreenSharingId(userId));
    }

    private getSpinner(userId: string): HTMLDivElement | null {
        const element = document.getElementById(`div-${userId}`);
        if (!element) {
            return null;
        }
        const connectingSpinnerDiv = element
            .getElementsByClassName("connecting-spinner")
            .item(0) as HTMLDivElement | null;
        return connectingSpinnerDiv;
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

    public requestNotification() {
        if (window.Notification && Notification.permission !== "granted") {
            return Notification.requestPermission();
        } else {
            return Promise.reject();
        }
    }

    public createNotification(userName: string, notificationType: NotificationType, forum: string | null = null) {
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
        //play notification message
        const elementAudioNewMessageNotification = document.getElementById("newMessageSound");
        if (this.canPlayNotificationMessage && elementAudioNewMessageNotification) {
            (elementAudioNewMessageNotification as HTMLAudioElement).volume = 0.2;
            (elementAudioNewMessageNotification as HTMLAudioElement)
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
