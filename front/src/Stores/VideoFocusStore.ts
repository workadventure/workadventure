import {writable} from "svelte/store";
import type {RemotePeer, SimplePeer} from "../WebRtc/SimplePeer";
import {VideoPeer} from "../WebRtc/VideoPeer";
import {ScreenSharingPeer} from "../WebRtc/ScreenSharingPeer";
import type {DisplayableMedia} from "./LayoutStore";

/**
 * A store that contains the peer / media that has currently the "importance" focus.
 */
function createVideoFocusStore() {
    const { subscribe, set, update } = writable<DisplayableMedia | null>(null);

    let focusedMedia: DisplayableMedia | null = null;

    return {
        subscribe,
        focus: (media: DisplayableMedia) => {
            focusedMedia = media;
            set(media);
        },
        removeFocus: () => {
            focusedMedia = null;
            set(null);
        },
        toggleFocus: (media: DisplayableMedia) => {
            if (media !== focusedMedia) {
                focusedMedia = media;
            } else {
                focusedMedia = null;
            }
            console.log('MEDIA', focusedMedia)
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
