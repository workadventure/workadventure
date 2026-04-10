import { derived } from "svelte/store";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { playerMovedInTheLast10Seconds } from "./VideoLayoutStore";
import { streamableCollectionStore } from "./StreamableCollectionStore";

/**
 * The streamables that are displayed in one line. So this excludes the highlighted embed screen.
 */
export const oneLineStreamableCollectionStore = derived(
    [streamableCollectionStore, highlightedEmbedScreen, playerMovedInTheLast10Seconds],
    ([$streamableCollectionStore, $highlightedEmbedScreen, $playerMovedInTheLast10Seconds]) => {
        return Array.from($streamableCollectionStore.values()).filter((videoBox) => {
            if ($highlightedEmbedScreen && !$playerMovedInTheLast10Seconds) {
                return videoBox.uniqueId !== $highlightedEmbedScreen.uniqueId;
            }
            return true;
        });
    }
);
