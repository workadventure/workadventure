import {isLookingLikeIframeEventWrapper, isIframeEventWrapper} from "./Event/IframeEvent";
import {userStore} from "./Stores/LocalUserStore";
import {ChatConnection} from "./Connection/ChatConnection";
import {connectionStore} from "./Stores/ConnectionStore";
import {get} from "svelte/store";

class IframeListener {
    init() {
        window.addEventListener("message", (message: MessageEvent<unknown>) => {
                const payload = message.data;
                const lookingLikeEvent = isLookingLikeIframeEventWrapper.safeParse(payload);
                if (lookingLikeEvent.success) {
                    const iframeEventGuarded = isIframeEventWrapper.safeParse(lookingLikeEvent.data);
                    if (iframeEventGuarded.success) {
                        const iframeEvent = iframeEventGuarded.data;
                        //console.info("Data received from WorkAdventure :", iframeEvent);
                        switch (iframeEvent.type){
                            case "userData": {
                                console.info("UserData received from WorkAdventure !");
                                userStore.set(iframeEvent.data);
                                connectionStore.set(new ChatConnection(iframeEvent.data.authToken ?? '', iframeEvent.data.playUri, iframeEvent.data.uuid));
                                //localUserStore.setUserData(iframeEvent.data);
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
                        }
                    }
                }
            }
        );
    };
}

export const iframeListener = new IframeListener();
