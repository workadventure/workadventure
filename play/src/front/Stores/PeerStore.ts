import { derived, Readable, readable, Writable, writable } from "svelte/store";
import type { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import { localUserStore } from "../Connection/LocalUserStore";
import { VideoPeer } from "../WebRtc/VideoPeer";
import { ExtendedStreamable } from "../Stores/StreamableCollectionStore";

export const peerStore: Writable<Readable<Map<string, VideoPeer>>> = writable<Writable<Map<string, VideoPeer>>>(
    writable<Map<string, VideoPeer>>(new Map())
);
export const screenSharingPeerStore: Writable<Readable<Map<string, ScreenSharingPeer>>> = writable<
    Readable<Map<string, ScreenSharingPeer>>
>(writable<Map<string, ScreenSharingPeer>>(new Map()));
export const livekitVideoStreamStore: Writable<Readable<Map<string, ExtendedStreamable>>> = writable<
    Readable<Map<string, ExtendedStreamable>>
>(writable<Map<string, ExtendedStreamable>>(new Map()));
export const livekitScreenShareStreamStore: Writable<Readable<Map<string, ExtendedStreamable>>> = writable<
    Readable<Map<string, ExtendedStreamable>>
>(writable<Map<string, ExtendedStreamable>>(new Map()));

export const peerElementsStore = derived(
    peerStore,
    ($peerStore, set) => {
        return $peerStore.subscribe(($innerPeerStore) => {
            set(Array.from($innerPeerStore.values()));
        });
    },
    [] as VideoPeer[]
);

//TODO : changer le type streamable + ajout du player et des props communes
export const livekitVideoStreamElementsStore = derived(
    livekitVideoStreamStore,
    ($livekitVideoStreamStore, set) => {
        return $livekitVideoStreamStore.subscribe(($innerLivekitVideoStreamStore) => {
            set(Array.from($innerLivekitVideoStreamStore.values()));
        });
    },
    [] as ExtendedStreamable[]
);

export const livekitScreenShareStreamElementsStore = derived(
    livekitScreenShareStreamStore,
    ($livekitScreenShareStreamStore, set) => {
        return $livekitScreenShareStreamStore.subscribe(($innerLivekitScreenShareStreamStore) => {
            set(Array.from($innerLivekitScreenShareStreamStore.values()));
        });
    },
    [] as ExtendedStreamable[]
);

/**
 * A store that contains ScreenSharingPeer, ONLY if those ScreenSharingPeer are emitting a stream towards us!
 */

function createScreenSharingStreamStore(): Readable<Map<string, ScreenSharingPeer>> {
    return readable(new Map<string, ScreenSharingPeer>(), (set) => {
        let unsubscribes: (() => void)[] = [];

        const unsubscribePeers = screenSharingPeerStore.subscribe((wrappedScreenSharingPeers) => {
            // Unsubscribe previous listeners
            unsubscribes.forEach((unsub) => unsub());
            unsubscribes = [];

            unsubscribes.push(
                wrappedScreenSharingPeers.subscribe((screenSharingPeers) => {
                    const newPeers = new Map<string, ScreenSharingPeer>();

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
                            set(new Map(newPeers));
                        });

                        unsubscribes.push(unsub);
                    });

                    set(new Map(newPeers));
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
