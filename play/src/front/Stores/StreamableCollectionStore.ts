import type { Readable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import type { ScreenSharingLocalMedia } from "./ScreenSharingStore";
import { screenSharingLocalMedia } from "./ScreenSharingStore";
import { peerStore, screenSharingStreamStore } from "./PeerStore";
import type { RemotePeer } from "../WebRtc/SimplePeer";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { gameSceneStore } from "./GameSceneStore";
import { createNestedStore } from "@workadventure/store-utils";
import { JitsiTrackWrapper } from "../Streaming/Jitsi/JitsiTrackWrapper";
import { GameScene } from "../Phaser/Game/GameScene";

export type Streamable = RemotePeer | ScreenSharingLocalMedia | JitsiTrackWrapper;

const jitsiTracksStore = createNestedStore<GameScene | undefined, Map<string, Readable<JitsiTrackWrapper>>>(
    gameSceneStore,
    (gameScene) =>
        gameScene
            ? gameScene.broadcastService.jitsiTracks
            : writable<Map<string, Readable<JitsiTrackWrapper>>>(new Map())
);

/**
 * A store that contains everything that can produce a stream (so the peers + the local screen sharing stream)
 */
function createStreamableCollectionStore(): Readable<Map<string, Streamable>> {
    return derived(
        [jitsiTracksStore, screenSharingStreamStore, peerStore, screenSharingLocalMedia],
        ([$jitsiTracksStore, $screenSharingStreamStore, $peerStore, $screenSharingLocalMedia] /*, set*/) => {
            const peers = new Map<string, Streamable>();

            const addPeer = (peer: Streamable) => {
                peers.set(peer.uniqueId, peer);
            };

            $screenSharingStreamStore.forEach(addPeer);
            $peerStore.forEach(addPeer);
            $jitsiTracksStore.forEach((jitsiTrackStore) => addPeer(get(jitsiTrackStore)));

            if ($screenSharingLocalMedia?.stream) {
                addPeer($screenSharingLocalMedia);
            }

            const $highlightedEmbedScreen = get(highlightedEmbedScreen);

            if ($highlightedEmbedScreen?.type === "streamable" && !peers.has($highlightedEmbedScreen.embed.uniqueId)) {
                highlightedEmbedScreen.removeHighlight();
            }

            //set(peers);
            return peers;
        }
    );
}

export const streamableCollectionStore = createStreamableCollectionStore();
