import { derived } from "svelte/store";
import { followStateStore } from "./FollowStore.ts";
import { isListenerStore, isSpeakerStore, silentStore } from "./MediaStore.ts";
import { screenSharingAvailableStore } from "./ScreenSharingStore.ts";
import { videoStreamElementsStore } from "./PeerStore.ts";
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
