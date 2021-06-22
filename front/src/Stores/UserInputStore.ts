import {derived} from "svelte/store";
import {consoleGlobalMessageManagerFocusStore} from "./ConsoleGlobalMessageManagerStore";

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    consoleGlobalMessageManagerFocusStore,
    ($consoleGlobalMessageManagerFocusStore) => {
        return !$consoleGlobalMessageManagerFocusStore;
    }
);