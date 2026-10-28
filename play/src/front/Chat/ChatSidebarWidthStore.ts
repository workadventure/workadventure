import { derived, writable } from "svelte/store";
import { chatVisibilityStore } from "../Stores/ChatStore";
import { windowSize } from "../Stores/CoWebsiteStore";
import { localUserStore } from "../Connection/LocalUserStore";
import { mapEditorSideBarWidthStore } from "../Components/MapEditor/MapEditorSideBarWidthStore";
import { mapEditorModeStore } from "../Stores/MapEditorStore";
import { sidePanelWidthStore } from "../Stores/SidePanelStore";
import { CHAT_SIDEBAR_MIN_WIDTH } from "./ChatSidebarWidth";

export const chatSidebarWidthStore = writable(Math.max(CHAT_SIDEBAR_MIN_WIDTH, localUserStore.getChatSideBarWidth()));

// Not unsubscribing is ok, this is a singleton.
//eslint-disable-next-line svelte/no-ignored-unsubscribe
chatSidebarWidthStore.subscribe((value) => {
    localUserStore.setChatSideBarWidth(value);
});

// The agenda / tasks panel alone always leaves enough room (it only takes room from md up): it counts with the
// chat or the map editor.
export const hideActionBarStoreBecauseOfChatBar = derived(
    [
        chatVisibilityStore,
        chatSidebarWidthStore,
        windowSize,
        mapEditorSideBarWidthStore,
        mapEditorModeStore,
        sidePanelWidthStore,
    ],
    ([
        $chatVisibilityStore,
        $chatSidebarWidthStore,
        $windowSize,
        $mapEditorWidthStore,
        $mapEditorModeStore,
        $sidePanelWidthStore,
    ]) => {
        if (!$chatVisibilityStore && !$mapEditorModeStore) {
            return false;
        }
        return (
            $windowSize.width -
                ($chatVisibilityStore ? $chatSidebarWidthStore : 0) -
                ($mapEditorModeStore ? $mapEditorWidthStore : 0) -
                $sidePanelWidthStore <
            285
        );
    },
);
