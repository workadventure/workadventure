import { derived, writable } from "svelte/store";
import { menuInputFocusStore } from "./MenuInputFocusStore";
import { chatInputFocusStore } from "./ChatStore";
import { showReportScreenStore, userReportEmpty } from "./ShowReportScreenStore";
import { emoteMenuStore } from "./EmoteStore";
import { wokaEmoteWheelVisibleStore } from "./WokaEmoteStore";
import { refreshPromptStore } from "./RefreshPromptStore";
import { mapDeletedPromptStore } from "./MapDeletedPromptStore";

export const inputFormFocusStore = writable(false);

export const mapExplorerSearchinputFocusStore = writable(false);

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    [
        menuInputFocusStore,
        chatInputFocusStore,
        showReportScreenStore,
        inputFormFocusStore,
        mapExplorerSearchinputFocusStore,
        emoteMenuStore,
        wokaEmoteWheelVisibleStore,
        refreshPromptStore,
        mapDeletedPromptStore,
    ],
    ([
        $menuInputFocusStore,
        $chatInputFocusStore,
        $showReportScreenStore,
        $inputFormFocusStore,
        $mapExplorerSearchinputFocusStore,
        $emoteMenuStore,
        $wokaEmoteWheelVisibleStore,
        $refreshPromptStore,
        $mapDeletedPromptStore,
    ]) => {
        return (
            !$menuInputFocusStore &&
            !$chatInputFocusStore &&
            !($showReportScreenStore !== userReportEmpty) &&
            !$inputFormFocusStore &&
            !$mapExplorerSearchinputFocusStore &&
            !$emoteMenuStore &&
            !$wokaEmoteWheelVisibleStore &&
            !$refreshPromptStore &&
            !$mapDeletedPromptStore
        );
    },
);
