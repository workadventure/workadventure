import { derived, writable } from "svelte/store";
import { menuInputFocusStore } from "./MenuStore";
import { chatInputFocusStore } from "./ChatStore";
import { showReportScreenStore, userReportEmpty } from "./ShowReportScreenStore";

export const inputFormFocusStore = writable(false);

document.addEventListener("focusin", (event) => {
    if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
    ) {
        inputFormFocusStore.set(true);
    }
});

document.addEventListener("focusout", (event) => {
    if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
    ) {
        inputFormFocusStore.set(false);
    }
});

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    [menuInputFocusStore, chatInputFocusStore, showReportScreenStore, inputFormFocusStore],
    ([$menuInputFocusStore, $chatInputFocusStore, $showReportScreenStore, $inputFormFocusStore]) => {
        return (
            !$menuInputFocusStore &&
            !$chatInputFocusStore &&
            !($showReportScreenStore !== userReportEmpty) &&
            !$inputFormFocusStore
        );
    }
);
