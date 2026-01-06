import type { Readable, Writable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import type { RemoteVideoTrack } from "livekit-client";
import { LayoutMode } from "../WebRtc/LayoutManager";
import type { PeerStatus } from "../WebRtc/RemotePeer";
import type { VideoConfig } from "../Api/Events/Ui/PlayVideoEvent";
import LL from "../../i18n/i18n-svelte";
import type { VideoBox } from "../Space/Space";
import { localSpaceUser } from "../Space/localSpaceUser";
import type { WebRtcStats } from "../Components/Video/WebRtcStats";
import { screenSharingLocalMedia } from "./ScreenSharingStore";

import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { embedScreenLayoutStore } from "./EmbedScreenLayoutStore";
import { highlightFullScreen } from "./ActionsCamStore";
import { scriptingVideoStore } from "./ScriptingVideoStore";
import { myCameraStore } from "./MyMediaStore";
import {
    cameraEnergySavingStore,
    isListenerStore,
    localVoiceIndicatorStore,
    localVolumeStore,
    mediaStreamConstraintsStore,
    requestedCameraState,
    requestedMicrophoneState,
    silentStore,
    localStreamStore,
} from "./MediaStore";
import { screenShareStreamElementsStore, videoStreamElementsStore } from "./PeerStore";
import { windowSize } from "./CoWebsiteStore";
import { muteMediaStreamStore } from "./MuteMediaStreamStore";
import { isLiveStreamingStore } from "./IsStreamingStore";
import { createDelayedUnsubscribeStore } from "./Utils/createDelayedUnsubscribeStore";

export interface LivekitStreamable {
    type: "livekit";
    remoteVideoTrack: Readable<RemoteVideoTrack | undefined>;
    readonly streamStore: Readable<MediaStream | undefined>;
    readonly isBlocked: Readable<boolean>;
}

export interface WebRtcStreamable {
    type: "webrtc";
    readonly streamStore: Readable<MediaStream | undefined>;
    readonly isBlocked: Readable<boolean>;
}

export interface ScriptingVideoStreamable {
    type: "scripting";
    url: string;
    config: VideoConfig;
    readonly isBlocked: Readable<boolean>;
}

export type StreamOrigin = "local" | "remote";
export type StreamCategory = "video" | "screenSharing" | "scripting";

export type StreamOriginCategory = `${StreamOrigin}_${StreamCategory}`;

export interface Streamable {
    readonly uniqueId: string;
    readonly media: LivekitStreamable | WebRtcStreamable | ScriptingVideoStreamable;
    readonly volumeStore: Readable<number[] | undefined> | undefined;
    readonly hasVideo: Readable<boolean>;
    readonly hasAudio: Readable<boolean>;
    readonly isMuted: Readable<boolean>;
    readonly statusStore: Readable<PeerStatus>;
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
    readonly spaceUserId: string | undefined;
    readonly closeStreamable: () => void;
    readonly volume: Writable<number>;
    readonly videoType: StreamOriginCategory;
    readonly webrtcStats: Readable<WebRtcStats | undefined> | undefined;
}

// MyLocalStreamable is a streamable that is the local camera streamable
// It is used to display the local camera stream in the picture in picture mode when the user have an highlighted embed screen
export interface MyLocalStreamable extends Streamable {
    // No readonly because it is used to update the displayInPictureInPictureMode of the local camera streamable
    displayInPictureInPictureMode: boolean;
    setDisplayInPictureInPictureMode: (displayInPictureInPictureMode: boolean) => void;
}

export const SCREEN_SHARE_STARTING_PRIORITY = 1000; // Priority for screen sharing streams
export const VIDEO_STARTING_PRIORITY = 2000; // Priority for other video streams
export const LAST_VIDEO_BOX_PRIORITY = 20000; // Priority for the last video boxes

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
    const streamable: MyLocalStreamable = {
        uniqueId: "-1",
        media: {
            type: "webrtc" as const,
            streamStore: createDelayedUnsubscribeStore(mutedLocalStream, 1000),
            isBlocked: writable(false),
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
        name: writable($LL.camera.my.nameTag()),
        showVoiceIndicator: localVoiceIndicatorStore,
        flipX: true,
        muteAudio: true,
        displayMode: "cover" as const,
        displayInPictureInPictureMode: false,
        usePresentationMode: false,
        spaceUserId: undefined,
        closeStreamable: () => {},
        volume: writable(1),
        videoType: "local_video",
        setDisplayInPictureInPictureMode: (displayInPictureInPictureMode: boolean) => {
            streamable.displayInPictureInPictureMode = displayInPictureInPictureMode;
        },
        webrtcStats: undefined,
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
            isListenerStore,
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
                $isListenerStore,
            ] /*, set*/
        ) => {
            const peers = new Map<string, VideoBox>();

            const addPeer = (videoBox: VideoBox) => {
                peers.set(videoBox.uniqueId, videoBox);
                // if peer is ScreenSharing, change for presentation Layout mode
                if (get(videoBox.streamable)?.usePresentationMode) {
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

                if ($isListenerStore) {
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
        displayOrder: writable(9999),
    };
};

export const streamableCollectionStore = createStreamableCollectionStore();

// Store to track if we are in a conversation with someone else
export const isInRemoteConversation = derived(
    [videoStreamElementsStore, screenShareStreamElementsStore, scriptingVideoStore, silentStore, isLiveStreamingStore],
    ([
        $screenSharingStreamStore,
        $videoStreamElementsStore,
        $scriptingVideoStore,
        $silentStore,
        $isLiveStreamingStore,
    ]) => {
        // If we are live streaming, we are in a conversation
        if ($isLiveStreamingStore) {
            return true;
        }

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
