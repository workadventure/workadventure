import type { Readable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import ListenerBox from "../Components/Video/ListenerBox.svelte";
import { LayoutMode } from "../WebRtc/LayoutManager";
import LL from "../../i18n/i18n-svelte";
import { VideoBox } from "../Space/VideoBox";
import type { Streamable } from "../Space/Streamable";
import { screenSharingLocalVideoBox } from "./ScreenSharingStore";

import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { embedScreenLayoutStore } from "./EmbedScreenLayoutStore";

import { scriptingVideoStore } from "./ScriptingVideoStore";
import { myCameraStore } from "./MyMediaStore";
import {
    cameraEnergySavingStore,
    isListenerStore,
    listenerSharingCameraStore,
    localStreamStore,
    localVoiceIndicatorStore,
    localVolumeStore,
    mediaStreamConstraintsStore,
    requestedCameraState,
    requestedMicrophoneState,
    silentStore,
} from "./MediaStore";
import { screenShareStreamElementsStore, videoStreamElementsStore } from "./PeerStore";
import { windowSize } from "./CoWebsiteStore";
import { muteMediaStreamStore } from "./MuteMediaStreamStore";
import { isLiveStreamingStore } from "./IsStreamingStore";
import { createDelayedUnsubscribeStore } from "./Utils/createDelayedUnsubscribeStore";

// MyLocalStreamable is a streamable that is the local camera streamable
// It is used to display the local camera stream in the picture in picture mode when the user have an highlighted embed screen
export interface MyLocalStreamable extends Streamable {
    // No readonly because it is used to update the displayInPictureInPictureMode of the local camera streamable
    displayInPictureInPictureMode: boolean;
    setDisplayInPictureInPictureMode: (displayInPictureInPictureMode: boolean) => void;
}

export const LISTENER_BOX_UNIQUE_ID = "listener-box";
export const LISTENER_BOX_PRIORITY = -4;

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

export const myCameraPeerStore: Readable<VideoBox> = derived([LL], ([$LL], set) => {
    const streamable: MyLocalStreamable = {
        uniqueId: "-1",
        media: {
            type: "webrtc" as const,
            streamStore: createDelayedUnsubscribeStore(mutedLocalStream, 1000),
            isBlocked: writable(false),
            setDimensions: () => {
                // Local camera does not support adaptive video (it's local)
            },
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
        muteAudio: writable(true),
        displayMode: "cover" as const,
        displayInPictureInPictureMode: false,
        usePresentationMode: false,
        spaceUserId: undefined,
        closeStreamable: () => {},
        volume: writable(1),
        videoType: "video",
        setDisplayInPictureInPictureMode: (displayInPictureInPictureMode: boolean) => {
            streamable.displayInPictureInPictureMode = displayInPictureInPictureMode;
        },
        webrtcStats: undefined,
    };
    const videoBox = VideoBox.fromLocalStreamable(streamable, -2);
    set(videoBox);
    return () => {
        videoBox.destroy();
    };
});

const listenerBoxStreamable: Streamable = {
    uniqueId: LISTENER_BOX_UNIQUE_ID,
    media: {
        type: "component",
        component: ListenerBox,
        isBlocked: writable(false),
    },
    volumeStore: undefined,
    hasVideo: writable(true),
    hasAudio: writable(false),
    isMuted: writable(true),
    statusStore: writable("connected" as const),
    name: writable("Listener"),
    showVoiceIndicator: writable(false),
    flipX: false,
    muteAudio: writable(true),
    displayMode: "fit",
    displayInPictureInPictureMode: false,
    usePresentationMode: false,
    spaceUserId: undefined,
    closeStreamable: () => {},
    volume: writable(1),
    videoType: "video",
    webrtcStats: undefined,
};

const listenerBoxVideoBox: VideoBox = VideoBox.fromLocalStreamable(listenerBoxStreamable, LISTENER_BOX_PRIORITY);

/**
 * A store that contains everything that can produce a stream (so the peers + the local screen sharing stream)
 */
function createStreamableCollectionStore(): Readable<Map<string, VideoBox>> {
    return derived(
        [
            screenShareStreamElementsStore,
            videoStreamElementsStore,
            screenSharingLocalVideoBox,
            scriptingVideoStore,
            myCameraStore,
            myCameraPeerStore,
            cameraEnergySavingStore,
            silentStore,
            requestedCameraState,
            windowSize,
            isLiveStreamingStore,
            isListenerStore,
            listenerSharingCameraStore,
        ],
        (
            [
                $screenShareStreamElementsStore,
                $videoStreamElementsStore,
                $screenSharingLocalVideoBox,
                $scriptingVideoStore,
                $myCameraStore,
                $myCameraPeerStore,
                $cameraEnergySavingStore,
                $silentStore,
                $requestedCameraState,
                $windowSize,
                $isLiveStreamingStore,
                $isListenerStore,
                $listenerSharingCameraStore,
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

                // Listeners can only show their camera if they have consented to share it (seeAttendees feature)
                if ($isListenerStore && !$listenerSharingCameraStore) {
                    shouldAddMyCamera = false;
                }

                if (shouldAddMyCamera) {
                    addPeer($myCameraPeerStore);
                }
            }

            $screenShareStreamElementsStore.forEach(addPeer);

            $videoStreamElementsStore.forEach(addPeer);
            $scriptingVideoStore.forEach((videoBox) => addPeer(videoBox));

            if ($screenSharingLocalVideoBox && get($screenSharingLocalVideoBox.streamable)?.media.type === "webrtc") {
                addPeer($screenSharingLocalVideoBox);
            }

            if ($isListenerStore && (peers.size === 0 || (peers.size === 1 && peers.has("-1")))) {
                addPeer(listenerBoxVideoBox);
            }

            const $highlightedEmbedScreen = get(highlightedEmbedScreen);

            if ($highlightedEmbedScreen && !peers.has($highlightedEmbedScreen.uniqueId)) {
                highlightedEmbedScreen.removeHighlight();
            }

            return peers;
        }
    );
}

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
    }
});
