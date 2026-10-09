import { derived } from "svelte/store";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { highlightCollapsedStore } from "./HighlightCollapsedStore";
import { streamableCollectionStore } from "./StreamableCollectionStore";

/**
 * The streamables that are displayed in one line. So this excludes the highlighted embed screen.
 */
export const oneLineStreamableCollectionStore = derived(
    [streamableCollectionStore, highlightedEmbedScreen, highlightCollapsedStore],
    ([$streamableCollectionStore, $highlightedEmbedScreen, $highlightCollapsedStore]) => {
        return Array.from($streamableCollectionStore.values()).filter((videoBox) => {
            if ($highlightedEmbedScreen && !$highlightCollapsedStore) {
                return videoBox.uniqueId !== $highlightedEmbedScreen.uniqueId;
            }
            return true;
        });
    },
);
