import {isLookingLikeIframeEventWrapper, isIframeEventWrapper} from "./Event/IframeEvent";
import {userStore} from "./Stores/LocalUserStore";
import {ChatConnection} from "./Connection/ChatConnection";

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
                            userStore.set(iframeEvent.data);
                            const connection = new ChatConnection(
                                iframeEvent.data.authToken ?? '',
                                iframeEvent.data.playUri
                            );
                            //localUserStore.setUserData(iframeEvent.data);
                        }
                    }
                }
            }
        );
    };
}

export const iframeListener = new IframeListener();
