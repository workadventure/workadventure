import { derived, writable } from "svelte/store";
import { ForwardableStore } from "@workadventure/store-utils";
import { localUserStore } from "../Connection/LocalUserStore";
import { ExtendedStreamable } from "../Stores/StreamableCollectionStore";

export const videoStreamStore = new ForwardableStore<Map<string, ExtendedStreamable>>(
    new Map<string, ExtendedStreamable>()
);
export const screenShareStreamStore = new ForwardableStore<Map<string, ExtendedStreamable>>(
    new Map<string, ExtendedStreamable>()
);

export const videoStreamElementsStore = derived(videoStreamStore, ($videoStreamStore) => {
    return Array.from($videoStreamStore.values());
});

export const screenShareStreamElementsStore = derived(screenShareStreamStore, ($screenShareStreamStore) => {
    return Array.from($screenShareStreamStore.values());
});

export const volumeProximityDiscussionStore = writable(localUserStore.getVolumeProximityDiscussion());

export const activePictureInPictureStore = writable(false);
