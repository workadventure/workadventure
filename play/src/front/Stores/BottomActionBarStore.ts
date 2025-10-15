import { derived } from "svelte/store";
import { followStateStore } from "./FollowStore";
import { isListenerStore, isSpeakerStore, silentStore } from "./MediaStore";
import { screenSharingAvailableStore } from "./ScreenSharingStore";
import { videoStreamElementsStore } from "./PeerStore";
export const bottomActionBarVisibilityStore = derived(
    [
        videoStreamElementsStore,
        followStateStore,
        silentStore,
        screenSharingAvailableStore,
        isSpeakerStore,
        isListenerStore,
    ],
    ([
        $videoStreamElementsStore,
        $followStateStore,
        $silentStore,
        $screenSharingAvailableStore,
        $isSpeakerStore,
        $isListenerStore,
    ]) => {
        return (
            ($videoStreamElementsStore.length > 0 &&
                !$isListenerStore &&
                (!$silentStore || $followStateStore != "off" || $screenSharingAvailableStore)) ||
            $isSpeakerStore
        );
    }
);
