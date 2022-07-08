import {isLookingLikeIframeEventWrapper, isIframeEventWrapper} from "./Event/IframeEvent";
import {userStore} from "./Stores/LocalUserStore";
import {ChatConnection} from "./Connection/ChatConnection";
import {connectionStore} from "./Stores/ConnectionStore";
import {setCurrentLocale} from "./i18n/locales";
import {Locales} from "./i18n/i18n-types";
import {get} from "svelte/store";

class IframeListener {
    init() {
        window.addEventListener("message", async (message: MessageEvent) => {
                const payload = message.data;
                const lookingLikeEvent = isLookingLikeIframeEventWrapper.safeParse(payload);
                if (lookingLikeEvent.success) {
                    const iframeEventGuarded = isIframeEventWrapper.safeParse(lookingLikeEvent.data);
                    if (iframeEventGuarded.success) {
                        const iframeEvent = iframeEventGuarded.data;
                        switch (iframeEvent.type) {
                            case "userData": {
                                //console.info("UserData received from WorkAdventure !");
                                userStore.set(iframeEvent.data);
                                connectionStore.set(new ChatConnection(iframeEvent.data.authToken ?? '', iframeEvent.data.playUri, iframeEvent.data.uuid));
                                break;
                            }
                            case "setLocale": {
                                await setCurrentLocale(iframeEvent.data.locale as Locales);
                                break;
                            }
                            case "joinMuc": {
                                get(connectionStore).getXmppClient()?.joinMuc(iframeEvent.data.name, iframeEvent.data.url, iframeEvent.data.type);
                                break;
                            }
                            case "leaveMuc": {
                                get(connectionStore).getXmppClient()?.leaveMuc(iframeEvent.data.url);
                                break;
                            }
                            case "updateWritingStatusChatList": {
                                console.log('updateWritingStatusChatList => iframeEvent', iframeEvent);
                                break;
                            }
                            case "updateMessagesChatList": {
                                console.log('updateMessagesChatList => iframeEvent', iframeEvent);
                                break;
                            }
                        }
                    }
                }
            }
        );
    };
}

export const iframeListener = new IframeListener();
