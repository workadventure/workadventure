import { derived } from "svelte/store";
import { followStateStore } from "./FollowStore";
import { silentStore } from "./MediaStore";
import { screenSharingAvailableStore } from "./ScreenSharingStore";
import { videoStreamElementsStore } from "./PeerStore";
export const bottomActionBarVisibilityStore = derived(
    [videoStreamElementsStore, followStateStore, silentStore, screenSharingAvailableStore],
    ([$videoStreamElementsStore, $followStateStore, $silentStore, $screenSharingAvailableStore]) => {
        return (
            $videoStreamElementsStore.length > 0 &&
            (!$silentStore || $followStateStore != "off" || $screenSharingAvailableStore)
        );
    }
);
