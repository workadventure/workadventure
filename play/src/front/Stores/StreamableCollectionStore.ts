import type { Readable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import { createNestedStore } from "@workadventure/store-utils";
import type { RemotePeer } from "../WebRtc/SimplePeer";
import { GameScene } from "../Phaser/Game/GameScene";
import { JitsiTrackWrapper } from "../Streaming/Jitsi/JitsiTrackWrapper";
import { JitsiTrackStreamWrapper } from "../Streaming/Jitsi/JitsiTrackStreamWrapper";
import type { ScreenSharingLocalMedia } from "./ScreenSharingStore";
import { screenSharingLocalMedia } from "./ScreenSharingStore";
import { peerStore, screenSharingStreamStore } from "./PeerStore";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { gameSceneStore } from "./GameSceneStore";

export type Streamable = RemotePeer | ScreenSharingLocalMedia | JitsiTrackStreamWrapper;

const jitsiTracksStore = createNestedStore<GameScene | undefined, Map<string, JitsiTrackWrapper>>(
    gameSceneStore,
    (gameScene) =>
        gameScene ? gameScene.broadcastService.jitsiTracks : writable<Map<string, JitsiTrackWrapper>>(new Map())
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
            console.warn("streamableCollectionStore triggerred");
            $jitsiTracksStore.forEach((jitsiTrackWrapper) => {
                const cameraTrackWrapper = jitsiTrackWrapper.cameraTrackWrapper;
                if (!cameraTrackWrapper.isEmpty()) {
                    addPeer(cameraTrackWrapper);
                }
                const screenSharingTrackWrapper = jitsiTrackWrapper.screenSharingTrackWrapper;
                if (!screenSharingTrackWrapper.isEmpty()) {
                    addPeer(screenSharingTrackWrapper);
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
