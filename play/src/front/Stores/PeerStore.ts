import { derived, Readable, readable, Writable, writable } from "svelte/store";
import type { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import { localUserStore } from "../Connection/LocalUserStore";
import { VideoPeer } from "../WebRtc/VideoPeer";
import { Streamable } from "./StreamableCollectionStore";

export const peerStore: Writable<Readable<Map<number, VideoPeer>>> = writable<Writable<Map<number, VideoPeer>>>(
    writable<Map<number, VideoPeer>>(new Map())
);
export const screenSharingPeerStore: Writable<Readable<Map<number, ScreenSharingPeer>>> = writable<
    Readable<Map<number, ScreenSharingPeer>>
>(writable<Map<number, ScreenSharingPeer>>(new Map()));
export const livekitVideoStreamStore: Writable<Readable<Map<number, Streamable>>> = writable<
    Readable<Map<number, Streamable>>
>(writable<Map<number, Streamable>>(new Map()));
export const livekitScreenShareStreamStore: Writable<Readable<Map<number, Streamable>>> = writable<
    Readable<Map<number, Streamable>>
>(writable<Map<number, Streamable>>(new Map()));

export const peerSizeStore = derived(
    peerStore,
    ($peerStore, set) => {
        return $peerStore.subscribe(($innerPeerStore) => {
            set($innerPeerStore.size);
        });
    },
    0
);

export const livekitVideoStreamSizeStore = derived(
    livekitVideoStreamStore,
    ($livekitVideoStreamStore, set) => {
        return $livekitVideoStreamStore.subscribe(($innerLivekitVideoStreamStore) => {
            set($innerLivekitVideoStreamStore.size);
        });
    },
    0
);

export const livekitScreenShareStreamSizeStore = derived(
    livekitScreenShareStreamStore,
    ($livekitScreenShareStreamStore, set) => {
        return $livekitScreenShareStreamStore.subscribe(($innerLivekitScreenShareStreamStore) => {
            set($innerLivekitScreenShareStreamStore.size);
        });
    },
    0
);

/**
 * A store that contains ScreenSharingPeer, ONLY if those ScreenSharingPeer are emitting a stream towards us!
 */

function createScreenSharingStreamStore(): Readable<Map<number, ScreenSharingPeer>> {
    return readable(new Map<number, ScreenSharingPeer>(), (set) => {
        let unsubscribes: (() => void)[] = [];

        const unsubscribePeers = screenSharingPeerStore.subscribe((wrappedScreenSharingPeers) => {
            // Unsubscribe previous listeners
            unsubscribes.forEach((unsub) => unsub());
            unsubscribes = [];

            unsubscribes.push(
                wrappedScreenSharingPeers.subscribe((screenSharingPeers) => {
                    const newPeers = new Map<number, ScreenSharingPeer>();

                    screenSharingPeers.forEach((screenSharingPeer, key) => {
                        if (screenSharingPeer.isReceivingScreenSharingStream()) {
                            newPeers.set(key, screenSharingPeer);
                        }

                        // Track stream changes per peer
                        const unsub = screenSharingPeer.streamStore.subscribe((stream) => {
                            if (stream) {
                                newPeers.set(key, screenSharingPeer);
                            } else {
                                newPeers.delete(key);
                            }
                            set(new Map(newPeers)); // Ensure a new Map instance for reactivity
                        });

                        unsubscribes.push(unsub);
                    });

                    set(new Map(newPeers)); // Ensure store reactivity
                })
            );
        });

        return () => {
            unsubscribePeers();
            unsubscribes.forEach((unsub) => unsub());
        };
    });
}

export const screenSharingStreamStore = createScreenSharingStreamStore();

export const volumeProximityDiscussionStore = writable(localUserStore.getVolumeProximityDiscussion());

export const activePictureInPictureStore = writable(false);
