import { derived, writable } from "svelte/store";
import { chatVisibilityStore } from "../Stores/ChatStore";
import { windowSize } from "../Stores/CoWebsiteStore";
import { localUserStore } from "../Connection/LocalUserStore";

export const chatSidebarWidthStore = writable(localUserStore.getChatSideBarWidth());

// Not unsubscribing is ok, this is a singleton.
//eslint-disable-next-line svelte/no-ignored-unsubscribe
chatSidebarWidthStore.subscribe((value) => {
    localUserStore.setChatSideBarWidth(value);
});

export const hideActionBarStoreBecauseOfChatBar = derived(
    [chatVisibilityStore, chatSidebarWidthStore, windowSize],
    ([$chatVisibilityStore, $chatSidebarWidthStore, $windowSize]) => {
        if (!$chatVisibilityStore) {
            return false;
        }
        return $windowSize.width - $chatSidebarWidthStore < 285;
    }
);
