import { derived, get, writable } from "svelte/store";
import type { CoWebsite } from "../WebRtc/CoWebsite/CoWesbite";
import { LayoutMode } from "../WebRtc/LayoutManager";
import { coWebsites } from "./CoWebsiteStore";
import { Streamable, streamableCollectionStore } from "./StreamableCollectionStore";

export type EmbedScreen =
    | {
          type: "streamable";
          embed: Streamable;
      }
    | {
          type: "cowebsite";
          embed: CoWebsite;
      };

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
                (embedScreen.type === "cowebsite" &&
                    currentEmbedScreen.type === "cowebsite" &&
                    embedScreen.embed.getId() !== currentEmbedScreen.embed.getId()) ||
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
export const embedScreenLayout = writable<LayoutMode>(LayoutMode.Presentation);

export const hasEmbedScreen = derived(
    [streamableCollectionStore],
    ($values) => get(streamableCollectionStore).size + get(coWebsites).length > 0
);
