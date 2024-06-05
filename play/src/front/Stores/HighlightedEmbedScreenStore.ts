import { writable } from "svelte/store";
import { Streamable } from "./StreamableCollectionStore";


function createHighlightedEmbedScreenStore() {
    const { subscribe, set, update } = writable<Streamable | undefined>(undefined);

    return {
        subscribe,
        highlight: (embedScreen: Streamable) => {
            set(embedScreen);
            console.log("JE SUIS DANS LE STORE SET HIGHLIGHT")
        },
        removeHighlight: () => {
            set(undefined);
            console.log("JE SUIS DANS LE STORE SET HIGHLIGHT")

        },
        toggleHighlight: (embedScreen: Streamable) => {
            update((currentEmbedScreen) => {
                console.log("JE SUIS DANS LE STORE TOGGLE HIGHLIGHT")

                if (!currentEmbedScreen || embedScreen !== currentEmbedScreen || embedScreen.uniqueId !== currentEmbedScreen.uniqueId) {
                    console.log("J'AI UN TOGGLE HIGHLIGHT")
                    return embedScreen;
                } else {
                    console.log("JE N'AI PAS DE TOGGLE HIGHLIGHT")
                    return undefined;
                }
            });
        },
    };
}

export const highlightedEmbedScreen = createHighlightedEmbedScreenStore();
