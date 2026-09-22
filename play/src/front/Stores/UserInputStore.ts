import { derived, writable } from "svelte/store";
import { menuInputFocusStore } from "./MenuInputFocusStore";
import { chatInputFocusStore } from "./ChatStore";
import { emoteMenuStore } from "./EmoteStore";
import { refreshPromptStore } from "./RefreshPromptStore";
import { mapDeletedPromptStore } from "./MapDeletedPromptStore";

export const inputFormFocusStore = writable(false);

export const mapExplorerSearchinputFocusStore = writable(false);

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    [
        menuInputFocusStore,
        chatInputFocusStore,
        inputFormFocusStore,
        mapExplorerSearchinputFocusStore,
        emoteMenuStore,
        refreshPromptStore,
        mapDeletedPromptStore,
    ],
    ([
        $menuInputFocusStore,
        $chatInputFocusStore,
        $inputFormFocusStore,
        $mapExplorerSearchinputFocusStore,
        $emoteMenuStore,
        $refreshPromptStore,
        $mapDeletedPromptStore,
    ]) => {
        return (
            !$menuInputFocusStore &&
            !$chatInputFocusStore &&
            !$inputFormFocusStore &&
            !$mapExplorerSearchinputFocusStore &&
            !$emoteMenuStore &&
            !$refreshPromptStore &&
            !$mapDeletedPromptStore
        );
    },
);
