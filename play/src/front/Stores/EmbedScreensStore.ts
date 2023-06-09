import { derived, writable } from "svelte/store";
import { LayoutMode } from "../WebRtc/LayoutManager";
import { coWebsites } from "./CoWebsiteStore";
import { streamableCollectionStore } from "./StreamableCollectionStore";

export const embedScreenLayoutStore = writable<LayoutMode>(LayoutMode.Presentation);

export const hasEmbedScreen = derived(
    [streamableCollectionStore, coWebsites],
    ([$streamableCollectionStore, $coWebsites]) => $streamableCollectionStore.size + $coWebsites.length > 0
);
