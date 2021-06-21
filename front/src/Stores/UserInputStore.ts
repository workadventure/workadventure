import {derived} from "svelte/store";
import {ConsoleGlobalMessageManagerFocusStore,} from "./ConsoleGlobalMessageManagerStore";

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    ConsoleGlobalMessageManagerFocusStore,
    ($ConsoleGlobalMessageManagerFocusStore) => {
        return !$ConsoleGlobalMessageManagerFocusStore;
    }
);