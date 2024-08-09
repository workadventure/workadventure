import { writable } from "svelte/store";
import { Streamable } from "./StreamableCollectionStore";

function createHighlightedEmbedScreenStore() {
    const { subscribe, set, update } = writable<Streamable | undefined>(undefined);

    return {
        subscribe,
        highlight: (embedScreen: Streamable) => {
            set(embedScreen);
        },
        removeHighlight: () => {
            set(undefined);
        },
        toggleHighlight: (embedScreen: Streamable) => {
            update((currentEmbedScreen) => {
                if (
                    !currentEmbedScreen ||
                    embedScreen !== currentEmbedScreen ||
                    embedScreen.uniqueId !== currentEmbedScreen.uniqueId
                ) {
                    return embedScreen;
                } else {
                    return undefined;
                }
            });
        },
    };
}

export const highlightedEmbedScreen = createHighlightedEmbedScreenStore();
