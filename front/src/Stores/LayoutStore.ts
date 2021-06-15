import {derived, get, Readable, writable} from "svelte/store";
import {ScreenSharingLocalMedia, screenSharingLocalMedia} from "./ScreenSharingStore";
import { peerStore, screenSharingStreamStore} from "./PeerStore";
import type {RemotePeer} from "../WebRtc/SimplePeer";
import {LayoutMode} from "../WebRtc/LayoutManager";

export type DisplayableMedia = RemotePeer | ScreenSharingLocalMedia;

export const layoutModeStore = writable<LayoutMode>(LayoutMode.Presentation);

/**
 * A store that contains the layout of the streams
 */
function createLayoutStore(): Readable<Map<string, DisplayableMedia>> {

    return derived([
        screenSharingStreamStore,
        peerStore,
        screenSharingLocalMedia,
    ], ([
            $screenSharingStreamStore,
            $peerStore,
            $screenSharingLocalMedia,
        ], set) => {

        const peers = new Map<string, DisplayableMedia>();

        const addPeer = (peer: DisplayableMedia) => {
            peers.set(peer.uniqueId, peer);
        };

        $screenSharingStreamStore.forEach(addPeer);
        $peerStore.forEach(addPeer);

        if ($screenSharingLocalMedia?.stream) {
            addPeer($screenSharingLocalMedia);
        }

        set(peers);
    });
}

export const layoutStore = createLayoutStore();
