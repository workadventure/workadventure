import { get, writable } from "svelte/store";
import type { Streamable } from "./StreamableCollectionStore";
import { peerStore } from "./PeerStore";

/**
 * A store that contains the peer / media that has currently the "importance" focus.
 */
function createVideoFocusStore() {
    const { subscribe, set } = writable<Streamable | null>(null);

    let focusedMedia: Streamable | null = null;

    return {
        subscribe,
        focus: (media: Streamable) => {
            focusedMedia = media;
            set(media);
        },
        removeFocus: () => {
            focusedMedia = null;
            set(null);
        },
        toggleFocus: (media: Streamable) => {
            focusedMedia = media !== focusedMedia ? media : null;
            set(focusedMedia);
        },
    };
}

export const videoFocusStore = createVideoFocusStore();

peerStore.subscribe((peers) => {
    const focusedMedia: Streamable | null = get(videoFocusStore);
    if (focusedMedia && focusedMedia.userId !== undefined && !peers.get(focusedMedia.userId)) {
        videoFocusStore.removeFocus();
    }
});
