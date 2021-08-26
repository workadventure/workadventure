import { derived } from "svelte/store";
import { menuInputFocusStore } from "./MenuStore";
import { chatInputFocusStore } from "./ChatStore";

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    [menuInputFocusStore, chatInputFocusStore],
    ([$menuInputFocusStore, $chatInputFocusStore]) => {
        return !$menuInputFocusStore && !$chatInputFocusStore;
    }
);
