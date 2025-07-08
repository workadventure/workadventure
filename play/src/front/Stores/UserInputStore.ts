import { derived, writable } from "svelte/store";
import { menuInputFocusStore } from "./MenuInputFocusStore";
import { chatInputFocusStore } from "./ChatStore";
import { showReportScreenStore, userReportEmpty } from "./ShowReportScreenStore";
import { emoteMenuStore } from "./EmoteStore";
import { refreshPromptStore } from "./RefreshPromptStore";

export const inputFormFocusStore = writable(false);

// Event listener is global and never freed
/* eslint-disable-next-line listeners/no-missing-remove-event-listener, listeners/no-inline-function-event-listener */
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

// Event listener is global and never freed
/* eslint-disable-next-line listeners/no-missing-remove-event-listener, listeners/no-inline-function-event-listener */
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
