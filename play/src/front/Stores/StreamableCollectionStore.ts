import { Readable, derived, get, writable } from "svelte/store";
import { RemoteVideoTrack } from "livekit-client";
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
    requestedCameraState,
    requestedMicrophoneState,
    silentStore,
} from "./MediaStore";
import { currentPlayerWokaStore } from "./CurrentPlayerWokaStore";
import { screenShareStreamElementsStore, videoStreamElementsStore } from "./PeerStore";
import { windowSize } from "./CoWebsiteStore";
import { muteMediaStreamStore } from "./MuteMediaStreamStore";
import { isLiveStreamingStore } from "./IsStreamingStore";

//export type Streamable = RemotePeer | ScreenSharingLocalMedia | JitsiTrackStreamWrapper;

export interface LivekitStreamable {
    type: "livekit";
    remoteVideoTrack: RemoteVideoTrack | undefined;
    //remoteAudioTrack: RemoteAudioTrack | undefined;
    readonly streamStore: Readable<MediaStream | undefined>;
}

export interface WebRtcStreamable {
    type: "webrtc";
    readonly streamStore: Readable<MediaStream | undefined>;
}

export interface ScriptingVideoStreamable {
    type: "scripting";
    url: string;
    config: VideoConfig;
}

export interface Streamable {
    readonly uniqueId: string;
    readonly media: LivekitStreamable | WebRtcStreamable | ScriptingVideoStreamable;
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

// Let's build a derived store from localstreamStoreValue that returns a stream containing only the video tracks
// (we don't want to play audio from our own microphone, that would create a feedback loop)
// We also need to handle the case where the video track is removed or added (because the user enabled or disabled his camera)

const mutedLocalStream = muteMediaStreamStore(localstreamStoreValue);

export const myCameraPeerStore: Readable<VideoBox> = derived([LL], ([$LL]) => {
    const streamable = {
        uniqueId: "-1",
        media: {
            type: "webrtc" as const,
            streamStore: mutedLocalStream,
        },
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
            requestedCameraState,
            windowSize,
            isLiveStreamingStore,
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
                $requestedCameraState,
                $windowSize,
                $isLiveStreamingStore,
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
                let shouldAddMyCamera = true;
                // Are we the only one to display video AND are we not publishing a video stream? If so, let's hide the video.
                // Are we the only one to display video AND we are on a small screen? If so, let's hide the video (because the webcam takes space and makes iPhones laggy when it starts)
                if (!$isLiveStreamingStore && (!$requestedCameraState || $windowSize.width < 768)) {
                    shouldAddMyCamera = false;
                }

                if (shouldAddMyCamera) {
                    addPeer($myCameraPeerStore);
                }
            }

            $screenShareStreamElementsStore.forEach(addPeer);

            $videoStreamElementsStore.forEach(addPeer);
            $scriptingVideoStore.forEach((streamable) => addPeer(streamableToVideoBox(streamable, 0)));

            if ($screenSharingLocalMedia && $screenSharingLocalMedia.media.type === "webrtc") {
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
