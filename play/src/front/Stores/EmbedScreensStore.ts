import { derived, writable } from "svelte/store";
import { coWebsites } from "./CoWebsiteStore";
import { streamableCollectionStore } from "./StreamableCollectionStore";

export const heightCamWrapper = writable(196);

export const hasEmbedScreen = derived(
    [streamableCollectionStore, coWebsites],
    ([$streamableCollectionStore, $coWebsites]) => $streamableCollectionStore.size + $coWebsites.length > 0
);
