import { readable, writable } from "svelte/store";
import type { RemotePeer, SimplePeer } from "../WebRtc/SimplePeer";
import { VideoPeer } from "../WebRtc/VideoPeer";
import { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";

/**
 * A store that contains the list of (video) peers we are connected to.
 */
function createPeerStore() {
    let peers = new Map<number, VideoPeer>();

    const { subscribe, set, update } = writable(peers);

    return {
        subscribe,
        connectToSimplePeer: (simplePeer: SimplePeer) => {
            peers = new Map<number, VideoPeer>();
            set(peers);
            simplePeer.registerPeerConnectionListener({
                onConnect(peer: RemotePeer) {
                    if (peer instanceof VideoPeer) {
                        update((users) => {
                            users.set(peer.userId, peer);
                            return users;
                        });
                    }
                },
                onDisconnect(userId: number) {
                    update((users) => {
                        users.delete(userId);
                        return users;
                    });
                },
            });
        },
    };
}

/**
 * A store that contains the list of screen sharing peers we are connected to.
 */
function createScreenSharingPeerStore() {
    let peers = new Map<number, ScreenSharingPeer>();

    const { subscribe, set, update } = writable(peers);

    return {
        subscribe,
        connectToSimplePeer: (simplePeer: SimplePeer) => {
            peers = new Map<number, ScreenSharingPeer>();
            set(peers);
            simplePeer.registerPeerConnectionListener({
                onConnect(peer: RemotePeer) {
                    if (peer instanceof ScreenSharingPeer) {
                        update((users) => {
                            users.set(peer.userId, peer);
                            return users;
                        });
                    }
                },
                onDisconnect(userId: number) {
                    update((users) => {
                        users.delete(userId);
                        return users;
                    });
                },
            });
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
