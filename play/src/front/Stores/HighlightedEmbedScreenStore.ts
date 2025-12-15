import { writable } from "svelte/store";
import type { VideoBox } from "../Space/Space";

function createHighlightedEmbedScreenStore() {
    const { subscribe, set, update } = writable<VideoBox | undefined>(undefined);

    return {
        subscribe,
        highlight: (embedScreen: VideoBox) => {
            set(embedScreen);
        },
        removeHighlight: () => {
            set(undefined);
        },
        toggleHighlight: (embedScreen: VideoBox) => {
            update((currentEmbedScreen) => {
                if (
                    !currentEmbedScreen ||
                    embedScreen !== currentEmbedScreen ||
                    embedScreen.uniqueId !== currentEmbedScreen.uniqueId
                ) {
                    return embedScreen;
                }
                return currentEmbedScreen;
            });
        },
    };
}

export const highlightedEmbedScreen = createHighlightedEmbedScreenStore();
