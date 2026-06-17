import type { Readable } from "svelte/store";
import { derived, get, writable } from "svelte/store";
import ListenerBox from "../Components/Video/ListenerBox.svelte";
import { LayoutMode } from "../WebRtc/LayoutManager";
import LL from "../../i18n/i18n-svelte";
import { VideoBox } from "../Space/VideoBox";
import type { Streamable } from "../Space/Streamable";
import { touchScreenManager } from "../Touch/TouchScreenManager";
import { screenSharingLocalVideoBox } from "./ScreenSharingStore";

import { highlightedEmbedScreen } from "./HighlightedEmbedScreenStore";
import { embedScreenLayoutStore } from "./EmbedScreenLayoutStore";

import { scriptingVideoStore } from "./ScriptingVideoStore";
import { myCameraStore } from "./MyMediaStore";
import {
    availabilityStatusStore,
    cameraEnergySavingStore,
    inLivekitStore,
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
import { currentPlayerGroupIdStore } from "./CurrentPlayerGroupStore";
import { shouldDisplayLocalCameraPeer } from "./StreamableCollectionRules";

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
    const streamable: Streamable = {
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
        hasVideo: derived([mediaStreamConstraintsStore, mutedLocalStream], ([mediaStreamConstraintsStore, stream]) => {
            return (
                mediaStreamConstraintsStore.video !== false &&
                stream !== undefined &&
                stream.getVideoTracks().length > 0
            );
        }),
        hasAudio: requestedMicrophoneState,
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
        canCloseStreamable: () => false,
        volume: writable(1),
        videoType: "video",
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
    canCloseStreamable: () => false,
    volume: writable(1),
    videoType: "video",
    webrtcStats: undefined,
};

const listenerBoxVideoBox: VideoBox = VideoBox.fromLocalStreamable(listenerBoxStreamable, LISTENER_BOX_PRIORITY);

// Store to track if we are in a conversation with someone else
export const isInRemoteConversation = derived(
    [videoStreamElementsStore, screenShareStreamElementsStore, scriptingVideoStore, silentStore, isLiveStreamingStore],
    ([
        $videoStreamElementsStore,
        $screenShareStreamElementsStore,
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
        if ($screenShareStreamElementsStore.length > 0) {
            return true;
        }

        // Check if we have any scripting videos
        if ($scriptingVideoStore.size > 0) {
            return true;
        }

        return false;
    },
);

const isInActiveConversationStore = derived(
    [isInRemoteConversation, currentPlayerGroupIdStore, inLivekitStore],
    ([$isInRemoteConversation, $currentPlayerGroupIdStore, $inLivekitStore]) =>
        $isInRemoteConversation || $currentPlayerGroupIdStore !== undefined || $inLivekitStore,
);

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
            isInActiveConversationStore,
            isListenerStore,
            listenerSharingCameraStore,
            availabilityStatusStore,
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
                $isInActiveConversationStore,
                $isListenerStore,
                $listenerSharingCameraStore,
                $availabilityStatusStore,
            ] /*, set*/,
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

            if (
                shouldDisplayLocalCameraPeer({
                    hasCameraDevice: $myCameraStore,
                    isCameraEnergySaving: $cameraEnergySavingStore,
                    isSilent: $silentStore,
                    requestedCameraState: $requestedCameraState,
                    windowWidth: $windowSize.width,
                    isMobile: touchScreenManager.primaryTouchDevice,
                    isInActiveConversation: $isInActiveConversationStore,
                    isListener: $isListenerStore,
                    listenerSharingCamera: $listenerSharingCameraStore,
                    availabilityStatus: $availabilityStatusStore,
                })
            ) {
                addPeer($myCameraPeerStore);
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
        },
    );
}

export const streamableCollectionStore = createStreamableCollectionStore();

// No need to unsubscribe, the store is global
// eslint-disable-next-line svelte/no-ignored-unsubscribe
streamableCollectionStore.subscribe((streamableCollection) => {
    // If the highlightedEmbedScreen is not in the streamableCollection, we remove the highlight
    const $highlightedEmbedScreen = get(highlightedEmbedScreen);
    if ($highlightedEmbedScreen && !streamableCollection.has($highlightedEmbedScreen.uniqueId)) {
        highlightedEmbedScreen.removeHighlight();
    }
});
