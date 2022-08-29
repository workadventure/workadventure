import { isLookingLikeIframeEventWrapper, isIframeEventWrapper } from "./Event/IframeEvent";
import { userStore } from "./Stores/LocalUserStore";
import {
    availabilityStatusStore,
    chatMessagesStore,
    ChatMessageTypes,
    chatNotificationsStore,
    chatPeerConnectionInProgress,
    chatSoundsStore,
    newChatMessageSubject,
    newChatMessageWritingStatusSubject,
    timelineActiveStore,
    timelineOpenedStore,
    writingStatusMessageStore,
} from "./Stores/ChatStore";
import { setCurrentLocale } from "./i18n/locales";
import { Locales } from "./i18n/i18n-types";
import { mucRoomsStore } from "./Stores/MucRoomsStore";
import { defaultUserData } from "./Xmpp/MucRoom";
import { connectionManager } from "./Connection/ChatConnectionManager";
import { chatVisibilityStore } from "./Stores/ChatStore";
import { NotificationType } from "./Media/MediaManager";
import { activeThreadStore } from "./Stores/ActiveThreadStore";
import { get } from "svelte/store";

class IframeListener {
    init() {
        window.addEventListener("message", (message: MessageEvent): void => {
            const payload = message.data;
            const lookingLikeEvent = isLookingLikeIframeEventWrapper.safeParse(payload);
            if (lookingLikeEvent.success) {
                const iframeEventGuarded = isIframeEventWrapper.safeParse(lookingLikeEvent.data);
                if (iframeEventGuarded.success) {
                    const iframeEvent = iframeEventGuarded.data;
                    switch (iframeEvent.type) {
                        case "userData": {
                            userStore.set(iframeEvent.data);
                            if (!connectionManager.connection) {
                                connectionManager.init(
                                    iframeEvent.data.playUri,
                                    iframeEvent.data.uuid,
                                    iframeEvent.data.authToken
                                );
                            }
                            break;
                        }
                        case "setLocale": {
                            setCurrentLocale(iframeEvent.data.locale as Locales).catch((err) => console.error(err));
                            break;
                        }
                        case "joinMuc": {
                            if (!connectionManager.connection) {
                                connectionManager.start();
                            }
                            connectionManager.connectionOrFail
                                .getXmppClient()
                                ?.joinMuc(
                                    iframeEvent.data.name,
                                    iframeEvent.data.url,
                                    iframeEvent.data.type,
                                    iframeEvent.data.subscribe
                                );
                            break;
                        }
                        case "leaveMuc": {
                            if (!connectionManager.connection) {
                                connectionManager.start();
                            }
                            connectionManager.connectionOrFail.getXmppClient()?.leaveMuc(iframeEvent.data.url);
                            break;
                        }
                        case "updateWritingStatusChatList": {
                            writingStatusMessageStore.set(iframeEvent.data);
                            break;
                        }
                        case "addChatMessage": {
                            if (iframeEvent.data.author == undefined || iframeEvent.data.text == undefined) {
                                break;
                            }

                            let userData = defaultUserData;
                            const mucRoomDefault = mucRoomsStore.getDefaultRoom();
                            if (mucRoomDefault) {
                                userData = mucRoomDefault.getUserDataByUuid(iframeEvent.data.author);
                            }

                            for (const chatMessageText of iframeEvent.data.text) {
                                chatMessagesStore.addExternalMessage(userData, chatMessageText);
                            }
                            break;
                        }
                        case "comingUser": {
                            for (const target of iframeEvent.data.targets) {
                                let userData = defaultUserData;
                                const mucRoomDefault = mucRoomsStore.getDefaultRoom();
                                if (mucRoomDefault) {
                                    userData = mucRoomDefault.getUserDataByUuid(target);
                                }

                                if (ChatMessageTypes.userIncoming === iframeEvent.data.type) {
                                    chatMessagesStore.addIncomingUser(userData);
                                }
                                if (ChatMessageTypes.userOutcoming === iframeEvent.data.type) {
                                    chatMessagesStore.addOutcomingUser(userData);
                                }
                            }
                            break;
                        }
                        case "peerConnectionStatus": {
                            chatPeerConnectionInProgress.set(iframeEvent.data);
                            if (iframeEvent.data) {
                                timelineOpenedStore.set(true);
                            }
                            break;
                        }
                        case "chatVisibility": {
                            chatVisibilityStore.set(iframeEvent.data.visibility);
                            if (!iframeEvent.data.visibility) {
                                activeThreadStore.reset();
                            } else if (get(chatPeerConnectionInProgress)) {
                                timelineActiveStore.set(true);
                            } else if (mucRoomsStore.getLiveRoom()) {
                                activeThreadStore.set(mucRoomsStore.getLiveRoom());
                            }
                            break;
                        }
                        case "settings": {
                            chatSoundsStore.set(iframeEvent.data.chatSounds);
                            chatNotificationsStore.set(iframeEvent.data.notification);
                            break;
                        }
                        case "availabilityStatus": {
                            availabilityStatusStore.set(iframeEvent.data);
                            break;
                        }
                    }
                }
            }
        });
    }

    openCoWebsite(
        url: string,
        allowApi?: boolean,
        allowPolicy?: string,
        widthPercent?: number,
        position?: number,
        closable?: boolean,
        lazy?: boolean
    ) {
        window.parent.postMessage(
            {
                id: 0,
                query: {
                    type: "openCoWebsite",
                    data: {
                        url,
                        allowApi,
                        allowPolicy,
                        widthPercent,
                        position,
                        closable,
                        lazy,
                    },
                },
            },
            "*"
        );
    }

    closeCoWebsite() {
        window.parent.postMessage(
            {
                id: 0,
                query: {
                    type: "closeCoWebsites",
                    data: undefined,
                },
            },
            "*"
        );
    }
    sendNotificationToFront(userName: string, notificationType: NotificationType, forum: null | string) {
        window.parent.postMessage(
            {
                type: "notification",
                data: { userName, notificationType, forum },
            },
            "*"
        );
    }

    sendLogin() {
        window.parent.postMessage(
            {
                type: "login",
            },
            "*"
        );
    }

    sendRefresh() {
        window.parent.postMessage(
            {
                type: "refresh",
            },
            "*"
        );
    }
}

export const iframeListener = new IframeListener();

/* @deprecated with new service chat messagerie */
//publis new message when user send message in chat timeline
newChatMessageSubject.subscribe((messgae) => {
    window.parent.postMessage(
        {
            type: "addPersonnalMessage",
            data: messgae,
        },
        "*"
    );
});
newChatMessageWritingStatusSubject.subscribe((status) => {
    window.parent.postMessage(
        {
            type: "newChatMessageWritingStatus",
            data: status,
        },
        "*"
    );
});
