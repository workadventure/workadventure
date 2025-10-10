import { derived } from "svelte/store";
import { followStateStore } from "./FollowStore";
import { inLivekitStore, isListenerStore, isSpeakerStore, silentStore } from "./MediaStore";
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
        inLivekitStore,
    ],
    ([
        $videoStreamElementsStore,
        $followStateStore,
        $silentStore,
        $screenSharingAvailableStore,
        $isSpeakerStore,
        $isListenerStore,
        $inLivekitStore,
    ]) => {
        return (
            ($videoStreamElementsStore.length > 0 &&
                !$isListenerStore &&
                !$inLivekitStore &&
                (!$silentStore || $followStateStore != "off" || $screenSharingAvailableStore)) ||
            $isSpeakerStore
        );
    }
);
