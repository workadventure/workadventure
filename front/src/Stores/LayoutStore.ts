import {derived, get} from "svelte/store";
import {ScreenSharingLocalMedia, screenSharingLocalMedia} from "./ScreenSharingStore";
import {DivImportance} from "../WebRtc/LayoutManager";
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

        const peers = new Map<DivImportance, Map<string, DisplayableMedia>>();
        peers.set(DivImportance.Normal, new Map<string, DisplayableMedia>());
        peers.set(DivImportance.Important, new Map<string, DisplayableMedia>());

        const addPeer = (peer: DisplayableMedia) => {
            const importance = get(peer.importanceStore);

            peers.get(importance)?.set(peer.uniqueId, peer);

            unsubscribes.push(peer.importanceStore.subscribe((importance) => {
                peers.forEach((category) => {
                    category.delete(peer.uniqueId);
                });
                peers.get(importance)?.set(peer.uniqueId, peer);
                set(peers);
            }));
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
