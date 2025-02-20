import { get, readable, writable } from "svelte/store";
import * as Sentry from "@sentry/svelte";
import { MapStore } from "@workadventure/store-utils";
import type { VideoPeer } from "../WebRtc/VideoPeer";
import type { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import { localUserStore } from "../Connection/LocalUserStore";

/**
 * A generic store that contains the list of (video or screenSharing) peers we are connected to.
 */
function createPeerStore<T>() {
    const { subscribe, update } = writable(new Map<string, MapStore<number, T>>());

    return {
        subscribe,
        getPeer(userId: number, spaceId: string): T | undefined {
            const spaceMap = get({ subscribe }).get(spaceId);
            if (!spaceMap) return undefined;
            return spaceMap.get(userId);
        },
        addPeer(userId: number, peer: T, spaceId: string) {
            update((spaces) => {
                if (!spaces.has(spaceId)) {
                    spaces.set(spaceId, new MapStore<number, T>());
                }
                const spaceMap = spaces.get(spaceId)!;
                spaceMap.set(userId, peer);
                return spaces;
            });
        },
        removePeer(userId: number, spaceId: string) {
            update((spaces) => {
                const spaceMap = spaces.get(spaceId);
                if (!spaceMap) {
                    Sentry.captureException(new Error("Error deleting peer connection - space not found"));
                    return spaces;
                }
                const peerConnectionDeleted = spaceMap.delete(userId);
                if (!peerConnectionDeleted) {
                    Sentry.captureException(new Error("Error deleting peer connection"));
                }
                if (spaceMap.size === 0) {
                    spaces.delete(spaceId);
                }
                return spaces;
            });
        },
        cleanupStore(spaceId: string) {
            update((spaces) => {
                spaces.delete(spaceId);
                return spaces;
            });
        },
        cleanupSpace(spaceId: string) {
            update((spaces) => {
                spaces.delete(spaceId);
                return spaces;
            });
        },
        getSize(): number {
            return Array.from(get({ subscribe }).values()).reduce((sum, spaceMap) => sum + spaceMap.size, 0);
        },
        getSpaceSize(spaceId: string): number {
            const spaceMap = get({ subscribe }).get(spaceId);
            return spaceMap?.size ?? 0;
        },

        getSpaceStore(spaceId: string): MapStore<number, T> | undefined {
            return get({ subscribe }).get(spaceId);
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

            screenSharingPeers.forEach((spaceMap) => {
                spaceMap.forEach((screenSharingPeer: ScreenSharingPeer, key: number) => {
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
