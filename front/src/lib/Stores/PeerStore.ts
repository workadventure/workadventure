import { get, readable, writable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import type { VideoPeer } from "../WebRtc/VideoPeer";
import type { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import { localUserStore } from "../Connection/LocalUserStore";

/**
 * A generic store that contains the list of (video or screenSharing) peers we are connected to.
 */
function createPeerStore<T>() {
    const { subscribe, set, update } = writable(new Map<number, T>());

    return {
        subscribe,
        getPeer(userId: number): T | undefined {
            return get({ subscribe }).get(userId);
        },
        addPeer(userId: number, peer: T) {
            update((users) => {
                users.set(userId, peer);
                return users;
            });
        },
        removePeer(userId: number) {
            update((users) => {
                const peerConnectionDeleted = users.delete(userId);
                if (!peerConnectionDeleted) {
                    Sentry.captureException(new Error("Error deleting peer connection"));
                }
                return users;
            });
        },
        cleanupStore() {
            set(new Map<number, T>());
        },
        getSize(): number {
            return get({ subscribe }).size;
        },
    };
}

export const peerStore = createPeerStore<VideoPeer>();
export const screenSharingPeerStore = createPeerStore<ScreenSharingPeer>();

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

export const volumeProximityDiscussionStore = writable(localUserStore.getVolumeProximityDiscussion());

export const activePictureInPictureStore = writable(false);
