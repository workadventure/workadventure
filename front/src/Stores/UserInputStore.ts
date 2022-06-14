import { derived } from "svelte/store";
import { menuInputFocusStore } from "./MenuStore";
import { chatInputFocusStore } from "../../chat/src/Stores/ChatStore";
import { showReportScreenStore, userReportEmpty } from "./ShowReportScreenStore";

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    [menuInputFocusStore, chatInputFocusStore, showReportScreenStore],
    ([$menuInputFocusStore, $chatInputFocusStore, $showReportScreenStore]) => {
        return !$menuInputFocusStore && !$chatInputFocusStore && !($showReportScreenStore !== userReportEmpty);
    }
);
