import { derived } from "svelte/store";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore.ts";
import { playerMovedInTheLast10Seconds } from "./VideoLayoutStore.ts";
import { streamableCollectionStore } from "./StreamableCollectionStore.ts";

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
