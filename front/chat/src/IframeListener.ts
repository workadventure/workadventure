import { isLookingLikeIframeEventWrapper, isIframeEventWrapper } from "./Event/IframeEvent";
import { userStore } from "./Stores/LocalUserStore";

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
                        //localUserStore.setUserData(iframeEvent.data);
                    }
                }
            }
        });
    }
}

export const iframeListener = new IframeListener();
