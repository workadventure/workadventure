import { derived, writable } from "svelte/store";
import { chatVisibilityStore } from "../Stores/ChatStore";
import { windowSize } from "../Stores/CoWebsiteStore";
import { localUserStore } from "../Connection/LocalUserStore";
import { mapEditorSideBarWidthStore } from "../Components/MapEditor/MapEditorSideBarWidthStore";
import { mapEditorModeStore } from "../Stores/MapEditorStore";

export const chatSidebarWidthStore = writable(localUserStore.getChatSideBarWidth());

// Not unsubscribing is ok, this is a singleton.
//eslint-disable-next-line svelte/no-ignored-unsubscribe
chatSidebarWidthStore.subscribe((value) => {
    localUserStore.setChatSideBarWidth(value);
});

export const hideActionBarStoreBecauseOfChatBar = derived(
    [chatVisibilityStore, chatSidebarWidthStore, windowSize, mapEditorSideBarWidthStore, mapEditorModeStore],
    ([$chatVisibilityStore, $chatSidebarWidthStore, $windowSize, $mapEditorWidthStore, $mapEditorModeStore]) => {
        if (!$chatVisibilityStore && !$mapEditorModeStore) {
            return false;
        }
        return (
            $windowSize.width -
                ($chatVisibilityStore ? $chatSidebarWidthStore : 0) -
                ($mapEditorModeStore ? $mapEditorWidthStore : 0) <
            285
        );
    }
);
