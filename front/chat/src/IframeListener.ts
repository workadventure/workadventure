import {isLookingLikeIframeEventWrapper, isIframeEventWrapper} from "./Event/IframeEvent";
import {userStore} from "./Stores/LocalUserStore";
import {ChatConnection} from "./Connection/ChatConnection";
import {connectionStore} from "./Stores/ConnectionStore";
import {XmppClient} from "./Xmpp/XmppClient";
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
                        if (iframeEvent.type === "userData") {
                            console.info("UserData received from WorkAdventure !");
                            userStore.set(iframeEvent.data);
                            connectionStore.set(new ChatConnection(iframeEvent.data.authToken ?? '', iframeEvent.data.playUri, iframeEvent.data.uuid));
                            //localUserStore.setUserData(iframeEvent.data);
                        }
                    }
                }
            }
        );
    };
}

export const iframeListener = new IframeListener();
