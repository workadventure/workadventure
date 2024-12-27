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
import { ChatRoom } from "../Chat/Connection/ChatConnection";
import { selectedRoomStore } from "../Chat/Stores/ChatStore";
import { gameManager } from "../Phaser/Game/GameManager";

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
    private messageChannel: BroadcastChannel;

    constructor() {
        this.messageChannel = new BroadcastChannel('messageChannel');
        this.initMessageChannel();
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

    private initMessageChannel() {
        this.messageChannel.onmessage = async (event) => {
            console.log("Received message in MediaManager:", event.data);
            if (event.data.type === "reply") {
                // Handle reply action
                const chatRoomId :string = JSON.parse(event.data.data.chatRoom);
                let room : ChatRoom | undefined;
                if(chatRoomId === "proximity") {
                    console.log("proximity");
                    proximityMeetingStore.set(true);
                    room = gameManager.getCurrentGameScene().proximityChatRoom;
                } else {
                    console.log("not proximity");
                    const chatConnection = await gameManager.getChatConnection();
                    room = await chatConnection.findRoomOrFolder(chatRoomId);
                }
                console.log("room", room);
                if(room) {
                    selectedRoomStore.set(room);
                }
            }
        };
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
        if (
            //this.canSendNotification &&
             Notification.permission === "granted") {
            return localUserStore.getNotification();
        } else {
            return false;
        }
    }

    public async createNotificationWithActions(userName: string, notificationType: NotificationType, chatRoom: string | null = null) {
        if (document.hasFocus()) {
            return;
        }
        console.log("createNotificationWithActions", userName, notificationType, chatRoom);
        if (this.hasNotification()) {
            const options = {
                icon: "/static/images/logo-WA-min.png",
                image: "/static/images/logo-WA-min.png",
                badge: "/static/images/logo-WA-min.png",
            };
            switch (notificationType) {
                case NotificationType.discussion:
                   // new Notification(`${userName} ${get(LL).notification.discussion()}`, options);
                    break;
                case NotificationType.message:
                    console.log("in message", userName, notificationType, chatRoom);
                    await navigator.serviceWorker.register("/notification-service-worker.js").then((registration) => {
                        console.log("in showNotification", userName, notificationType, chatRoom);
                        registration.showNotification(`${userName} ${get(LL).notification.message()} ${
                            chatRoom !== null && get(LL).notification.chatRoom() + " " + chatRoom
                        }`, {
                            ...options,
                            actions: [{ action: "reply", title: "Reply" }],
                             data: {
                                 chatRoom : JSON.stringify(chatRoom),
                             },
                        });
               });

                    break;
            }
            this.canSendNotification = false;
            setTimeout(() => (this.canSendNotification = true), TIME_NOTIFYING_MILLISECOND);
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