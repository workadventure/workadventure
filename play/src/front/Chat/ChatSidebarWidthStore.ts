import { derived, writable } from "svelte/store";
import { chatVisibilityStore, INITIAL_SIDEBAR_WIDTH } from "../Stores/ChatStore";
import { windowSize } from "../Stores/CoWebsiteStore";

export const chatSidebarWidthStore = writable(INITIAL_SIDEBAR_WIDTH);

export const hideActionBarStoreBecauseOfChatBar = derived(
    [chatVisibilityStore, chatSidebarWidthStore, windowSize],
    ([$chatVisibilityStore, $chatSidebarWidthStore, $windowSize]) => {
        if (!$chatVisibilityStore) {
            return false;
        }
        return $windowSize.width - $chatSidebarWidthStore < 285;
    }
);
