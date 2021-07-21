import { derived } from "svelte/store";
import { consoleGlobalMessageManagerFocusStore } from "./ConsoleGlobalMessageManagerStore";
import { chatInputFocusStore } from "./ChatStore";

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    [consoleGlobalMessageManagerFocusStore, chatInputFocusStore],
    ([$consoleGlobalMessageManagerFocusStore, $chatInputFocusStore]) => {
        return !$consoleGlobalMessageManagerFocusStore && !$chatInputFocusStore;
    }
);
