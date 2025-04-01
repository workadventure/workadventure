import { Readable, derived, get, writable } from "svelte/store";
import { createNestedStore } from "@workadventure/store-utils";
import { GameScene } from "../Phaser/Game/GameScene";
import { JitsiTrackWrapper } from "../Streaming/Jitsi/JitsiTrackWrapper";
import { JitsiTrackStreamWrapper } from "../Streaming/Jitsi/JitsiTrackStreamWrapper";
import { TrackWrapper } from "../Streaming/Common/TrackWrapper";
import { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import { LayoutMode } from "../WebRtc/LayoutManager";
import { PeerStatus } from "../WebRtc/VideoPeer";
import { SpaceUserExtended } from "../Space/SpaceFilter/SpaceFilter";
import { VideoConfig } from "../Api/Events/Ui/PlayVideoEvent";
import LL from "../../i18n/i18n-svelte";
import { screenSharingLocalMedia } from "./ScreenSharingStore";
import { peerStore, screenSharingStreamStore } from "./PeerStore";
import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { gameSceneStore } from "./GameSceneStore";
import { embedScreenLayoutStore } from "./EmbedScreensStore";
import { highlightFullScreen } from "./ActionsCamStore";
import { scriptingVideoStore } from "./ScriptingVideoStore";
import { myCameraStore } from "./MyMediaStore";
import {
    cameraEnergySavingStore,
    localStreamStore,
    localVoiceIndicatorStore,
    localVolumeStore,
    requestedCameraState,
    requestedMicrophoneState,
    silentStore,
} from "./MediaStore";
import { currentPlayerWokaStore } from "./CurrentPlayerWokaStore";

//export type Streamable = RemotePeer | ScreenSharingLocalMedia | JitsiTrackStreamWrapper;

export interface MediaStoreStreamable {
    type: "mediaStore";
    readonly streamStore: Readable<MediaStream | undefined>;
}

export interface JitsiTrackStreamable {
    type: "jitsiTrack";
    jitsiTrackStreamWrapper: JitsiTrackStreamWrapper;
}

export interface ScriptingVideoStreamable {
    type: "scripting";
    url: string;
    config: VideoConfig;
}

export interface AttachableVideo {
    attach: (container: HTMLElement) => void;
}

export interface Streamable {
    readonly uniqueId: string;
    readonly media: MediaStoreStreamable | JitsiTrackStreamable | ScriptingVideoStreamable;
    readonly volumeStore: Readable<number[] | undefined> | undefined;
    readonly hasVideo: Readable<boolean>;
    readonly hasAudio: Readable<boolean>;
    readonly isMuted: Readable<boolean>;
    readonly statusStore: Readable<PeerStatus>;
    readonly getExtendedSpaceUser: () => Promise<SpaceUserExtended> | undefined;
    readonly name: Readable<string>;
    readonly showVoiceIndicator: Readable<boolean>;
    readonly pictureStore: Readable<string | undefined>;
    readonly flipX: boolean;
    // If set to true, the video will be muted (no sound will come out, even if the underlying stream has an audio track attached).
    // This does not prevent the volume bar from being displayed.
    // We use this for local camera feedback.
    readonly muteAudio: boolean;
    // In fit mode, the video will fit into the container and be fully visible, even if it does not fill the full container
    // In cover mode, the video will cover the full container, even if it means that some parts of the video are not visible
    readonly displayMode: "fit" | "cover";
    readonly displayInPictureInPictureMode: boolean;
}

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

export const myJitsiCameraStore: Readable<Streamable | null> = derived([jitsiTracksStore], ([$jitsiTracksStore]) => {
    for (const jitsiTrackWrapper of $jitsiTracksStore.values()) {
        if (jitsiTrackWrapper.isLocal) {
            const cameraTrackWrapper = jitsiTrackWrapper.cameraTrackWrapper;
            /*if (cameraTrackWrapper.isEmpty()) {
                return null;
            }*/
            cameraTrackWrapper.flipX = true;
            cameraTrackWrapper.muteAudio = true;
            return cameraTrackWrapper;
        }
    }
    return null;
});

const localstreamStoreValue = derived(localStreamStore, (myLocalStream) => {
    if (myLocalStream.type === "success") {
        return myLocalStream.stream;
    }
    return undefined;
});

export const myCameraPeerStore: Readable<Streamable> = derived([LL], ([$LL]) => {
    return {
        uniqueId: "-1",
        media: {
            type: "mediaStore" as const,
            streamStore: localstreamStoreValue,
        },
        volumeStore: localVolumeStore,
        hasVideo: requestedCameraState,
        // hasAudio = true because the webcam has a microphone attached and could potentially play sound
        hasAudio: writable(true),
        isMuted: derived(requestedMicrophoneState, (micState) => !micState),
        statusStore: writable("connected" as const),
        getExtendedSpaceUser: () => undefined,
        name: writable($LL.camera.my.nameTag()),
        showVoiceIndicator: localVoiceIndicatorStore,
        pictureStore: currentPlayerWokaStore,
        flipX: true,
        muteAudio: true,
        displayMode: "cover" as const,
        displayInPictureInPictureMode: false,
    };
});

/**
 * A store that contains everything that can produce a stream (so the peers + the local screen sharing stream)
 */
function createStreamableCollectionStore(): Readable<Map<string, Streamable>> {
    return derived(
        [
            broadcastTracksStore,
            screenSharingStreamStore,
            peerStore,
            screenSharingLocalMedia,
            scriptingVideoStore,
            myCameraStore,
            myJitsiCameraStore,
            myCameraPeerStore,
            cameraEnergySavingStore,
            silentStore,
        ],
        (
            [
                $broadcastTracksStore,
                $screenSharingStreamStore,
                $peerStore,
                $screenSharingLocalMedia,
                $scriptingVideoStore,
                $myCameraStore,
                $myJitsiCameraStore,
                $myCameraPeerStore,
                $cameraEnergySavingStore,
                $silentStore,
            ] /*, set*/
        ) => {
            const peers = new Map<string, Streamable>();

            const addPeer = (peer: Streamable) => {
                peers.set(peer.uniqueId, peer);
                // if peer is ScreenSharing, change for presentation Layout mode
                if (peer instanceof ScreenSharingPeer) {
                    // FIXME: we should probably do that only when the screen sharing is activated for the first time
                    embedScreenLayoutStore.set(LayoutMode.Presentation);
                }
            };

            if ($myCameraStore && !$myJitsiCameraStore && !$cameraEnergySavingStore && !$silentStore) {
                addPeer($myCameraPeerStore);
            } else if ($myJitsiCameraStore) {
                addPeer($myJitsiCameraStore);
            }

            $screenSharingStreamStore.forEach(addPeer);
            $peerStore.forEach(addPeer);
            $scriptingVideoStore.forEach(addPeer);

            $broadcastTracksStore.forEach((trackWrapper) => {
                if (trackWrapper instanceof JitsiTrackWrapper) {
                    const cameraTrackWrapper = trackWrapper.cameraTrackWrapper;
                    if (/*!cameraTrackWrapper.isEmpty() &&*/ !trackWrapper.isLocal) {
                        addPeer(cameraTrackWrapper);
                    }
                    const screenSharingTrackWrapper = trackWrapper.screenSharingTrackWrapper;
                    if (
                        !screenSharingTrackWrapper.isEmpty() &&
                        screenSharingTrackWrapper.jitsiTrackWrapper.getImmediateSpaceUser()?.screenSharingState !==
                            false
                    ) {
                        addPeer(screenSharingTrackWrapper);
                    }
                }
            });

            if (
                $screenSharingLocalMedia &&
                $screenSharingLocalMedia.media.type === "mediaStore" &&
                get($screenSharingLocalMedia.media.streamStore)
            ) {
                addPeer($screenSharingLocalMedia);
            }

            const $highlightedEmbedScreen = get(highlightedEmbedScreen);

            if ($highlightedEmbedScreen && !peers.has($highlightedEmbedScreen.uniqueId)) {
                highlightedEmbedScreen.removeHighlight();
                highlightFullScreen.set(false);
            }

            return peers;
        }
    );
}

export const streamableCollectionStore = createStreamableCollectionStore();

/**
 * A store containing only the streamables that should be displayed in picture-in-picture mode
 */
export const streamablePictureInPictureStore = derived(streamableCollectionStore, ($streamableCollectionStore) => {
    return new Map(
        Array.from($streamableCollectionStore.values())
            .filter((streamable) => streamable.displayInPictureInPictureMode)
            .map((streamable) => [streamable.uniqueId, streamable])
    );
});

// Store to track if we are in a conversation with someone else
export const isInRemoteConversation = derived(
    [broadcastTracksStore, screenSharingStreamStore, peerStore, scriptingVideoStore, silentStore],
    ([$broadcastTracksStore, $screenSharingStreamStore, $peerStore, $scriptingVideoStore, $silentStore]) => {
        // If we are silent, we are not in a conversation
        if ($silentStore) {
            return false;
        }

        // Check if we have any peers
        if ($peerStore.size > 0) {
            return true;
        }

        // Check if we have any broadcast tracks (excluding local ones)
        for (const trackWrapper of $broadcastTracksStore.values()) {
            if (trackWrapper instanceof JitsiTrackWrapper && !trackWrapper.isLocal) {
                return true;
            }
        }

        // Check if we have any screen sharing streams
        if ($screenSharingStreamStore.size > 0) {
            return true;
        }

        // Check if we have any scripting videos
        if ($scriptingVideoStore.size > 0) {
            return true;
        }

        return false;
    }
);

// No need to unsubscribe, the store is global
// eslint-disable-next-line svelte/no-ignored-unsubscribe
streamableCollectionStore.subscribe((streamableCollection) => {
    // If the highlightedEmbedScreen is not in the streamableCollection, we remove the highlight
    const $highlightedEmbedScreen = get(highlightedEmbedScreen);
    if ($highlightedEmbedScreen && !streamableCollection.has($highlightedEmbedScreen.uniqueId)) {
        highlightedEmbedScreen.removeHighlight();
        highlightFullScreen.set(false);
    }
});
