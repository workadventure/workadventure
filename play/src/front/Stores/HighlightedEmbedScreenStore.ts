import { writable } from "svelte/store";
import { Streamable } from "./StreamableCollectionStore";


function createHighlightedEmbedScreenStore() {
    const { subscribe, set, update } = writable<Streamable | undefined>(undefined);

    return {
        subscribe,
        highlight: (embedScreen: Streamable) => {
            set(embedScreen);
            console.log("highlightedEmbedScreen: ", embedScreen, "il est toggle");

        },
        removeHighlight: () => {
            set(undefined);

        },
        toggleHighlight: (embedScreen: Streamable) => {

            update((currentEmbedScreen) => {
                if (!currentEmbedScreen || embedScreen !== currentEmbedScreen || embedScreen.uniqueId !== currentEmbedScreen.uniqueId) {
                    console.log("highlightedEmbedScreen: ", "il est toggle", embedScreen);
                    return embedScreen;
                } else {
                    console.log("highlightedEmbedScreen: ", "il est pas toggle",  embedScreen);
                    return undefined;
                }
            });
        },
    };
}

export const highlightedEmbedScreen = createHighlightedEmbedScreenStore();
