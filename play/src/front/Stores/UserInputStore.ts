import { derived, writable } from "svelte/store";
import { menuInputFocusStore } from "./MenuInputFocusStore.ts";
import { chatInputFocusStore } from "./ChatStore.ts";
import { showReportScreenStore, userReportEmpty } from "./ShowReportScreenStore.ts";
import { emoteMenuStore } from "./EmoteStore.ts";
import { refreshPromptStore } from "./RefreshPromptStore.ts";

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
        refreshPromptStore,
    ],
    ([
        $menuInputFocusStore,
        $chatInputFocusStore,
        $showReportScreenStore,
        $inputFormFocusStore,
        $mapExplorerSearchinputFocusStore,
        $emoteMenuStore,
        $refreshPromptStore,
    ]) => {
        return (
            !$menuInputFocusStore &&
            !$chatInputFocusStore &&
            !($showReportScreenStore !== userReportEmpty) &&
            !$inputFormFocusStore &&
            !$mapExplorerSearchinputFocusStore &&
            !$emoteMenuStore &&
            !$refreshPromptStore
        );
    }
);
