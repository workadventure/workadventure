import { derived, Readable, Writable, writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";
import { ExtendedStreamable } from "../Stores/StreamableCollectionStore";

export const videoStreamStore: Writable<Readable<Map<string, ExtendedStreamable>>> = writable<
    Readable<Map<string, ExtendedStreamable>>
>(writable<Map<string, ExtendedStreamable>>(new Map()));
export const screenShareStreamStore: Writable<Readable<Map<string, ExtendedStreamable>>> = writable<
    Readable<Map<string, ExtendedStreamable>>
>(writable<Map<string, ExtendedStreamable>>(new Map()));

export const videoStreamElementsStore = derived(
    videoStreamStore,
    ($videoStreamStore, set) => {
        return $videoStreamStore.subscribe(($innerVideoStreamStore) => {
            set(Array.from($innerVideoStreamStore.values()));
        });
    },
    [] as ExtendedStreamable[]
);

export const screenShareStreamElementsStore = derived(
    screenShareStreamStore,
    ($screenShareStreamStore, set) => {
        return $screenShareStreamStore.subscribe(($innerScreenShareStreamStore) => {
            set(Array.from($innerScreenShareStreamStore.values()));
        });
    },
    [] as ExtendedStreamable[]
);

export const volumeProximityDiscussionStore = writable(localUserStore.getVolumeProximityDiscussion());

export const activePictureInPictureStore = writable(false);
