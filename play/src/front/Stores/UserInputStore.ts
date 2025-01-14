import { derived, writable } from "svelte/store";
import { menuInputFocusStore } from "./MenuInputFocusStore";
import { chatInputFocusStore } from "./ChatStore";
import { showReportScreenStore, userReportEmpty } from "./ShowReportScreenStore";

export const inputFormFocusStore = writable(false);

document.addEventListener("focusin", (event) => {
    if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLDivElement &&
            (event.target.getAttribute("role") === "textbox" ||
                event.target.classList.contains("block-user-action") ||
                event.target.getAttribute("contenteditable") === "true"))
    ) {
        inputFormFocusStore.set(true);
    }
});

document.addEventListener("focusout", (event) => {
    if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLDivElement &&
            (event.target.getAttribute("role") === "textbox" ||
                event.target.classList.contains("block-user-action") ||
                event.target.getAttribute("contenteditable") === "true"))
    ) {
        inputFormFocusStore.set(false);
    }
});

export const mapExplorerSearchinputFocusStore = writable(false);

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    [
        menuInputFocusStore,
        chatInputFocusStore,
        showReportScreenStore,
        inputFormFocusStore,
        mapExplorerSearchinputFocusStore,
    ],
    ([
        $menuInputFocusStore,
        $chatInputFocusStore,
        $showReportScreenStore,
        $inputFormFocusStore,
        $mapExplorerSearchinputFocusStore,
    ]) => {
        return (
            !$menuInputFocusStore &&
            !$chatInputFocusStore &&
            !($showReportScreenStore !== userReportEmpty) &&
            !$inputFormFocusStore &&
            !$mapExplorerSearchinputFocusStore
        );
    }
);
