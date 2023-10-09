import { get, writable } from "svelte/store";
import { JitsiTrackStreamWrapper } from "../Streaming/Jitsi/JitsiTrackStreamWrapper";
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

// It is ok to not unsubscribe to this store because it is a singleton.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
peerStore.subscribe((peers) => {
    const focusedMedia: Streamable | null = get(videoFocusStore);
    if (focusedMedia instanceof JitsiTrackStreamWrapper) {
        return;
    }
    if (focusedMedia && focusedMedia.userId !== undefined && !peers.get(focusedMedia.userId)) {
        videoFocusStore.removeFocus();
    }
});
