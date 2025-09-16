import { Readable, derived, get, writable } from "svelte/store";
import { ScreenSharingPeer } from "../WebRtc/ScreenSharingPeer";
import { LayoutMode } from "../WebRtc/LayoutManager";
import { PeerStatus } from "../WebRtc/VideoPeer";
import { SpaceUserExtended } from "../Space/SpaceInterface";
import { VideoConfig } from "../Api/Events/Ui/PlayVideoEvent";
import LL from "../../i18n/i18n-svelte";
import { VideoBox } from "../Space/Space";
import { localSpaceUser } from "../Space/localSpaceUser";
import { screenSharingLocalMedia } from "./ScreenSharingStore";

import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { embedScreenLayoutStore } from "./EmbedScreenLayoutStore";
import { highlightFullScreen } from "./ActionsCamStore";
import { scriptingVideoStore } from "./ScriptingVideoStore";
import { myCameraStore } from "./MyMediaStore";
import {
    cameraEnergySavingStore,
    localStreamStore,
    localVoiceIndicatorStore,
    localVolumeStore,
    mediaStreamConstraintsStore,
    requestedMicrophoneState,
    silentStore,
} from "./MediaStore";
import { currentPlayerWokaStore } from "./CurrentPlayerWokaStore";
import { screenShareStreamElementsStore, videoStreamElementsStore } from "./PeerStore";

//export type Streamable = RemotePeer | ScreenSharingLocalMedia | JitsiTrackStreamWrapper;

export interface MediaStoreStreamable {
    type: "mediaStore";
    // TODO: split this into two stores, one for video and one for audio. Only the audio one might be useful for the scripting API actually.
    /** @deprecated */
    readonly streamStore: Readable<MediaStream | undefined>;
    readonly attachVideo: (container: HTMLVideoElement) => void;
    readonly detachVideo: (container: HTMLVideoElement) => void;
    readonly attachAudio: (container: HTMLAudioElement) => void;
    readonly detachAudio: (container: HTMLAudioElement) => void;
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
    readonly media: MediaStoreStreamable | ScriptingVideoStreamable;
    readonly volumeStore: Readable<number[] | undefined> | undefined;
    readonly hasVideo: Readable<boolean>;
    readonly hasAudio: Readable<boolean>;
    readonly isMuted: Readable<boolean>;
    readonly statusStore: Readable<PeerStatus>;
    readonly getExtendedSpaceUser: () => SpaceUserExtended | undefined;
    readonly name: Readable<string>;
    readonly showVoiceIndicator: Readable<boolean>;
    readonly flipX: boolean;
    // If set to true, the video will be muted (no sound will come out, even if the underlying stream has an audio track attached).
    // This does not prevent the volume bar from being displayed.
    // We use this for local camera feedback.
    readonly muteAudio: boolean;
    // In fit mode, the video will fit into the container and be fully visible, even if it does not fill the full container
    // In cover mode, the video will cover the full container, even if it means that some parts of the video are not visible
    readonly displayMode: "fit" | "cover";
    readonly displayInPictureInPictureMode: boolean;
    readonly usePresentationMode: boolean;
    readonly once: (event: string, callback: (...args: unknown[]) => void) => void;
}

export const SCREEN_SHARE_STARTING_PRIORITY = 1000; // Priority for screen sharing streams
export const VIDEO_STARTING_PRIORITY = 2000; // Priority for other video streams

const localstreamStoreValue = derived(localStreamStore, (myLocalStream) => {
    if (myLocalStream.type === "success") {
        return myLocalStream.stream;
    }
    return undefined;
});

export const myCameraPeerStore: Readable<VideoBox> = derived([LL], ([$LL]) => {
    const videoElementUnsubscribers = new Map<HTMLVideoElement, () => void>();
    const media = {
        type: "mediaStore" as const,
        streamStore: localstreamStoreValue,
        attachVideo: (container: HTMLVideoElement) => {
            const unsubscribe = localstreamStoreValue.subscribe((stream) => {
                if (stream) {
                    const videoTracks = stream.getVideoTracks();
                    if (videoTracks.length > 0) {
                        container.srcObject = new MediaStream(videoTracks);
                    } else {
                        container.srcObject = null;
                    }
                }
            });
            // Store the unsubscribe function in our Map
            videoElementUnsubscribers.set(container, unsubscribe);
        },
        detachVideo: (container: HTMLVideoElement) => {
            // Clean up the stream
            container.srcObject = null;
            // Call the unsubscribe function if it exists and remove it from the Map
            const unsubscribe = videoElementUnsubscribers.get(container);
            if (unsubscribe) {
                unsubscribe();
                videoElementUnsubscribers.delete(container);
            }
        },
        attachAudio: (container: HTMLAudioElement) => {
            // Never attach audio for the local camera, as we don't want audio feedback loop
        },
        detachAudio: (container: HTMLAudioElement) => {
            // Never attach audio for the local camera, as we don't want audio feedback loop
        },
    } satisfies MediaStoreStreamable;

    const streamable = {
        uniqueId: "-1",
        media,
        volumeStore: localVolumeStore,
        hasVideo: derived(
            mediaStreamConstraintsStore,
            ($mediaStreamConstraintsStore) => $mediaStreamConstraintsStore.video !== false
        ),
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
        usePresentationMode: false,
        once: (event: string, callback: (...args: unknown[]) => void) => {
            callback();
        },
        priority: -2,
    };
    return streamableToVideoBox(streamable, -2);
});

/**
 * A store that contains everything that can produce a stream (so the peers + the local screen sharing stream)
 */
function createStreamableCollectionStore(): Readable<Map<string, VideoBox>> {
    return derived(
        [
            screenShareStreamElementsStore,
            videoStreamElementsStore,
            screenSharingLocalMedia,
            scriptingVideoStore,
            myCameraStore,
            myCameraPeerStore,
            cameraEnergySavingStore,
            silentStore,
        ],
        (
            [
                $screenShareStreamElementsStore,
                $videoStreamElementsStore,
                $screenSharingLocalMedia,
                $scriptingVideoStore,
                $myCameraStore,
                $myCameraPeerStore,
                $cameraEnergySavingStore,
                $silentStore,
            ] /*, set*/
        ) => {
            const peers = new Map<string, VideoBox>();

            const addPeer = (videoBox: VideoBox) => {
                peers.set(videoBox.uniqueId, videoBox);
                // if peer is ScreenSharing, change for presentation Layout mode
                if (videoBox.streamable instanceof ScreenSharingPeer || get(videoBox.streamable)?.usePresentationMode) {
                    // FIXME: we should probably do that only when the screen sharing is activated for the first time
                    embedScreenLayoutStore.set(LayoutMode.Presentation);
                }
            };

            if ($myCameraStore && !$cameraEnergySavingStore && !$silentStore) {
                addPeer($myCameraPeerStore);
            }

            $screenShareStreamElementsStore.forEach(addPeer);

            $videoStreamElementsStore.forEach(addPeer);
            $scriptingVideoStore.forEach((streamable) => addPeer(streamableToVideoBox(streamable, 0)));

            if ($screenSharingLocalMedia && $screenSharingLocalMedia.media.type === "mediaStore") {
                addPeer(streamableToVideoBox($screenSharingLocalMedia, -1));
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

const streamableToVideoBox = (streamable: Streamable, priority: number): VideoBox => {
    return {
        uniqueId: streamable.uniqueId,
        spaceUser: localSpaceUser(get(streamable.name)),
        streamable: writable(streamable),
        priority,
    };
};

export const streamableCollectionStore = createStreamableCollectionStore();

/**
 * A store containing only the streamables that should be displayed in picture-in-picture mode
 */
export const streamablePictureInPictureStore = derived(streamableCollectionStore, ($streamableCollectionStore) => {
    return new Map(
        Array.from($streamableCollectionStore.values())
            .filter((videoBox) => get(videoBox.streamable)?.displayInPictureInPictureMode)
            .map((videoBox) => [videoBox.uniqueId, videoBox])
    );
});

// Store to track if we are in a conversation with someone else
export const isInRemoteConversation = derived(
    [videoStreamElementsStore, screenShareStreamElementsStore, scriptingVideoStore, silentStore],
    ([$screenSharingStreamStore, $videoStreamElementsStore, $scriptingVideoStore, $silentStore]) => {
        // If we are silent, we are not in a conversation
        if ($silentStore) {
            return false;
        }

        // Check if we have any peers
        if ($videoStreamElementsStore.length > 0) {
            return true;
        }

        // Check if we have any screen sharing streams
        if ($screenSharingStreamStore.length > 0) {
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
