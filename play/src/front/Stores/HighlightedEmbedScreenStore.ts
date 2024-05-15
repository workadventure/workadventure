import { writable } from "svelte/store";
import { CoWebsite } from "../WebRtc/CoWebsite/CoWebsite";
import { Streamable } from "./StreamableCollectionStore";

export type EmbedScreen =
    {
        type: "streamable";
        embed: Streamable;
    }

function createHighlightedEmbedScreenStore() {
    const { subscribe, set, update } = writable<EmbedScreen | undefined>(undefined);

    return {
        subscribe,
        highlight: (embedScreen: EmbedScreen) => {
            set(embedScreen);
        },
        removeHighlight: () => {
            set(undefined);
        },
        toggleHighlight: (embedScreen: EmbedScreen) => {
            update((currentEmbedScreen) =>
                !currentEmbedScreen ||
                embedScreen.type !== currentEmbedScreen.type ||
                (embedScreen.type === "streamable" &&
                    currentEmbedScreen.type === "streamable" &&
                    embedScreen.embed.uniqueId !== currentEmbedScreen.embed.uniqueId)
                    ? embedScreen
                    : undefined
            );
        },
    };
}

export const highlightedEmbedScreen = createHighlightedEmbedScreenStore();
