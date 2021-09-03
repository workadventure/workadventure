import { readable, writable } from "svelte/store";
import type { VideoPeer } from "../WebRtc/VideoPeer";
import type { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";

/**
 * A store that contains the list of (video) peers we are connected to.
 */
function createPeerStore() {
    const { subscribe, set, update } = writable(new Map<number, VideoPeer>());

    return {
        subscribe,
        pushNewPeer(peer: VideoPeer) {
            update((users) => {
                users.set(peer.userId, peer);
                return users;
            });
        },
        removePeer(userId: number) {
            update((users) => {
                users.delete(userId);
                return users;
            });
        },
        cleanupStore() {
            set(new Map<number, VideoPeer>());
        },
    };
}

/**
 * A store that contains the list of screen sharing peers we are connected to.
 */
function createScreenSharingPeerStore() {
    const { subscribe, set, update } = writable(new Map<number, ScreenSharingPeer>());

    return {
        subscribe,
        pushNewPeer(peer: ScreenSharingPeer) {
            update((users) => {
                users.set(peer.userId, peer);
                return users;
            });
        },
        removePeer(userId: number) {
            update((users) => {
                users.delete(userId);
                return users;
            });
        },
        cleanupStore() {
            set(new Map<number, ScreenSharingPeer>());
        },
    };
}

export const peerStore = createPeerStore();
export const screenSharingPeerStore = createScreenSharingPeerStore();

/**
 * A store that contains ScreenSharingPeer, ONLY if those ScreenSharingPeer are emitting a stream towards us!
 */
function createScreenSharingStreamStore() {
    let peers = new Map<number, ScreenSharingPeer>();

    return readable<Map<number, ScreenSharingPeer>>(peers, function start(set) {
        let unsubscribes: (() => void)[] = [];

        const unsubscribe = screenSharingPeerStore.subscribe((screenSharingPeers) => {
            for (const unsubscribe of unsubscribes) {
                unsubscribe();
            }
            unsubscribes = [];

            peers = new Map<number, ScreenSharingPeer>();

            screenSharingPeers.forEach((screenSharingPeer: ScreenSharingPeer, key: number) => {
                if (screenSharingPeer.isReceivingScreenSharingStream()) {
                    peers.set(key, screenSharingPeer);
                }

                unsubscribes.push(
                    screenSharingPeer.streamStore.subscribe((stream) => {
                        if (stream) {
                            peers.set(key, screenSharingPeer);
                        } else {
                            peers.delete(key);
                        }
                        set(peers);
                    })
                );
            });

            set(peers);
        });

        return function stop() {
            unsubscribe();
            for (const unsubscribe of unsubscribes) {
                unsubscribe();
            }
        };
    });
}

export const screenSharingStreamStore = createScreenSharingStreamStore();
