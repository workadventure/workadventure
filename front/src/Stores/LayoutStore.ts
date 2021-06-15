import {derived, get, writable} from "svelte/store";
import {ScreenSharingLocalMedia, screenSharingLocalMedia} from "./ScreenSharingStore";
import { peerStore, screenSharingStreamStore} from "./PeerStore";
import type {RemotePeer} from "../WebRtc/SimplePeer";

export type DisplayableMedia = RemotePeer | ScreenSharingLocalMedia;

/**
 * A store that contains the layout of the streams
 */
function createLayoutStore() {

    let unsubscribes: (()=>void)[] = [];

    return derived([
        screenSharingStreamStore,
        peerStore,
        screenSharingLocalMedia,
    ], ([
            $screenSharingStreamStore,
            $peerStore,
            $screenSharingLocalMedia,
        ], set) => {
        for (const unsubscribe of unsubscribes) {
            unsubscribe();
        }
        unsubscribes = [];

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
