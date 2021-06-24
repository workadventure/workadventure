import {writable} from "svelte/store";
import type {RemotePeer, SimplePeer} from "../WebRtc/SimplePeer";
import {VideoPeer} from "../WebRtc/VideoPeer";
import {ScreenSharingPeer} from "../WebRtc/ScreenSharingPeer";
import type {Streamable} from "./StreamableCollectionStore";

/**
 * A store that contains the peer / media that has currently the "importance" focus.
 */
function createVideoFocusStore() {
    const { subscribe, set, update } = writable<Streamable | null>(null);

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
            if (media !== focusedMedia) {
                focusedMedia = media;
            } else {
                focusedMedia = null;
            }
            set(focusedMedia);
        },
        connectToSimplePeer: (simplePeer: SimplePeer) => {
            simplePeer.registerPeerConnectionListener({
                onConnect(peer: RemotePeer) {
                },
                onDisconnect(userId: number) {
                    if ((focusedMedia instanceof VideoPeer || focusedMedia instanceof ScreenSharingPeer) && focusedMedia.userId === userId) {
                        set(null);
                    }
                }
            })
        }
    };
}

export const videoFocusStore = createVideoFocusStore();
