import type { Readable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import { createNestedStore } from "@workadventure/store-utils";
import type { RemotePeer } from "../WebRtc/SimplePeer";
import { GameScene } from "../Phaser/Game/GameScene";
import { JitsiTrackWrapper } from "../Streaming/Jitsi/JitsiTrackWrapper";
import { JitsiTrackStreamWrapper } from "../Streaming/Jitsi/JitsiTrackStreamWrapper";
import { TrackWrapper } from "../Streaming/Common/TrackWrapper";
import type { ScreenSharingLocalMedia } from "./ScreenSharingStore";
import { screenSharingLocalMedia } from "./ScreenSharingStore";
import { peerStore, screenSharingStreamStore } from "./PeerStore";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { gameSceneStore } from "./GameSceneStore";

export type Streamable = RemotePeer | ScreenSharingLocalMedia | JitsiTrackStreamWrapper;

const broadcastTracksStore = createNestedStore<GameScene | undefined, Map<string, TrackWrapper>>(
    gameSceneStore,
    (gameScene) => (gameScene ? gameScene.broadcastService.getTracks() : writable<Map<string, TrackWrapper>>(new Map()))
);

const jitsiTracksStore = derived([broadcastTracksStore], ([$broadcastTracksStore]) => {
    const jitsiTracks = new Map<string, JitsiTrackWrapper>();
    for (const [key, value] of $broadcastTracksStore) {
        if (value instanceof JitsiTrackWrapper) {
            jitsiTracks.set(key, value);
        }
    }
    return jitsiTracks;
});

/**
 * A store that contains everything that can produce a stream (so the peers + the local screen sharing stream)
 */
function createStreamableCollectionStore(): Readable<Map<string, Streamable>> {
    return derived(
        [broadcastTracksStore, screenSharingStreamStore, peerStore, screenSharingLocalMedia],
        ([$broadcastTracksStore, $screenSharingStreamStore, $peerStore, $screenSharingLocalMedia] /*, set*/) => {
            const peers = new Map<string, Streamable>();

            const addPeer = (peer: Streamable) => {
                peers.set(peer.uniqueId, peer);
            };

            $screenSharingStreamStore.forEach(addPeer);
            $peerStore.forEach(addPeer);

            $broadcastTracksStore.forEach((trackWrapper) => {
                console.log("trackWrapper", trackWrapper);
                if (trackWrapper instanceof JitsiTrackWrapper) {
                    const cameraTrackWrapper = trackWrapper.cameraTrackWrapper;
                    console.log("cameraTrackWrapper", cameraTrackWrapper);
                    if (/*!cameraTrackWrapper.isEmpty() &&*/ !trackWrapper.isLocal) {
                        addPeer(cameraTrackWrapper);
                    }
                    const screenSharingTrackWrapper = trackWrapper.screenSharingTrackWrapper;
                    if (
                        !screenSharingTrackWrapper.isEmpty() &&
                        screenSharingTrackWrapper.jitsiTrackWrapper.spaceUser?.screenSharingState !== false
                    ) {
                        addPeer(screenSharingTrackWrapper);
                    }
                }
            });

            if ($screenSharingLocalMedia?.stream) {
                addPeer($screenSharingLocalMedia);
            }

            const $highlightedEmbedScreen = get(highlightedEmbedScreen);

            if ($highlightedEmbedScreen?.type === "streamable" && !peers.has($highlightedEmbedScreen.embed.uniqueId)) {
                highlightedEmbedScreen.removeHighlight();
            }

            return peers;
        }
    );
}

export const streamableCollectionStore = createStreamableCollectionStore();

export const myJitsiCameraStore = derived([jitsiTracksStore], ([$jitsiTracksStore]) => {
    for (const jitsiTrackWrapper of $jitsiTracksStore.values()) {
        if (jitsiTrackWrapper.isLocal) {
            const cameraTrackWrapper = jitsiTrackWrapper.cameraTrackWrapper;
            /*if (cameraTrackWrapper.isEmpty()) {
                return null;
            }*/
            return cameraTrackWrapper;
        }
    }
    return null;
});
