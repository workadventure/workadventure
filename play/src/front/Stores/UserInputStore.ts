import { derived } from "svelte/store";
import { menuInputFocusStore } from "./MenuStore";
import { chatInputFocusStore } from "./ChatStore";
import { showReportScreenStore, userReportEmpty } from "./ShowReportScreenStore";
import { mapEditorInputStore } from "./MapEditorStore";

//derived from the focus on Menu, ConsoleGlobal, Chat and ...
export const enableUserInputsStore = derived(
    [menuInputFocusStore, chatInputFocusStore, showReportScreenStore, mapEditorInputStore],
    ([$menuInputFocusStore, $chatInputFocusStore, $showReportScreenStore, $mapEditorInputStore]) => {
        return !$menuInputFocusStore && !$chatInputFocusStore && !($showReportScreenStore !== userReportEmpty) && !$mapEditorInputStore;
    }
);
