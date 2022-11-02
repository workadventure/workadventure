import { isLookingLikeIframeEventWrapper, isIframeEventWrapper } from "./Event/IframeEvent";
import { userStore } from "./Stores/LocalUserStore";
import {
    availabilityStatusStore,
    chatMessagesStore,
    ChatMessageTypes,
    chatNotificationsStore,
    chatPeerConnectionInProgress,
    chatSoundsStore,
    enableChat,
    enableChatUpload,
    newChatMessageSubject,
    newChatMessageWritingStatusSubject,
    timelineActiveStore,
    timelineMessagesToSee,
    timelineOpenedStore,
    writingStatusMessageStore,
} from "./Stores/ChatStore";
import { setCurrentLocale } from "./i18n/locales";
import { Locales } from "./i18n/i18n-types";
import { mucRoomsStore } from "./Stores/MucRoomsStore";
import { chatConnectionManager } from "./Connection/ChatConnectionManager";
import { chatVisibilityStore } from "./Stores/ChatStore";
import { NotificationType } from "./Media/MediaManager";
import { activeThreadStore } from "./Stores/ActiveThreadStore";
import { get } from "svelte/store";
import { emojiRegex } from "./Utils/HtmlUtils";

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
                        case "settings": {
                            chatSoundsStore.set(iframeEvent.data.chatSounds);
                            chatNotificationsStore.set(iframeEvent.data.notification);
                            enableChat.set(iframeEvent.data.enableChat);
                            enableChatUpload.set(iframeEvent.data.enableChatUpload);
                            break;
                        }
                        case "xmppSettingsMessage": {
                            chatConnectionManager.initXmppSettings(iframeEvent.data);
                            break;
                        }
                        case "userData": {
                            iframeEvent.data.name = iframeEvent.data.name.replace(emojiRegex, "");
                            userStore.set(iframeEvent.data);
                            if (!chatConnectionManager.connection) {
                                chatConnectionManager.initUser(
                                    iframeEvent.data.playUri,
                                    iframeEvent.data.uuid,
                                    iframeEvent.data.authToken
                                );
                            } else {
                                mucRoomsStore.sendPresences();
                            }
                            break;
                        }
                        case "setLocale": {
                            setCurrentLocale(iframeEvent.data.locale as Locales).catch((err) => console.error(err));
                            break;
                        }
                        case "joinMuc": {
                            if (!get(enableChat)) {
                                return;
                            }
                            chatConnectionManager.connectionOrFail?.joinMuc(
                                iframeEvent.data.name,
                                iframeEvent.data.url,
                                iframeEvent.data.type,
                                iframeEvent.data.subscribe
                            );
                            break;
                        }
                        case "leaveMuc": {
                            if (!get(enableChat)) {
                                return;
                            }
                            chatConnectionManager.connectionOrFail?.leaveMuc(iframeEvent.data.url);
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
                            const mucRoomDefault = mucRoomsStore.getDefaultRoom();
                            if (mucRoomDefault) {
                                let userData = undefined;
                                try {
                                    userData = mucRoomDefault.getUserByJid(iframeEvent.data.author);
                                } finally {
                                    // Nothing to do
                                }
                                for (const chatMessageText of iframeEvent.data.text) {
                                    chatMessagesStore.addExternalMessage(
                                        userData,
                                        chatMessageText,
                                        userData ? undefined : iframeEvent.data.author
                                    );
                                }
                            }
                            break;
                        }
                        case "comingUser": {
                            for (const target of iframeEvent.data.targets) {
                                const mucRoomDefault = mucRoomsStore.getDefaultRoom();
                                if (mucRoomDefault) {
                                    const userData = mucRoomDefault.getUserByJid(target);
                                    if (userData) {
                                        if (ChatMessageTypes.userIncoming === iframeEvent.data.type) {
                                            chatMessagesStore.addIncomingUser(userData);
                                        }
                                        if (ChatMessageTypes.userOutcoming === iframeEvent.data.type) {
                                            chatMessagesStore.addOutcomingUser(userData);
                                        }
                                    }
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
                            } else if (get(chatPeerConnectionInProgress) || get(timelineMessagesToSee) > 0) {
                                timelineActiveStore.set(true);
                            } else if (mucRoomsStore.getLiveRoom()) {
                                activeThreadStore.set(mucRoomsStore.getLiveRoom());
                            }
                            break;
                        }
                        case "availabilityStatus": {
                            availabilityStatusStore.set(iframeEvent.data);
                            break;
                        }
                    }
                } else {
                    console.error("Message structure not conform", lookingLikeEvent.data, iframeEventGuarded);
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

    sendShowBusinessCard(visitCardUrl: string) {
        window.parent.postMessage(
            {
                type: "showBusinessCard",
                data: { visitCardUrl },
            },
            "*"
        );
    }

    sendRedirectPricing() {
        window.parent.postMessage(
            {
                type: "redirectPricing",
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
