import { derived } from "svelte/store";
import { followStateStore } from "./FollowStore";
import { silentStore } from "./MediaStore";
import { screenSharingAvailableStore } from "./ScreenSharingStore";
import { peerSizeStore } from "./PeerStore";
export const bottomActionBarVisibilityStore = derived(
    [peerSizeStore, followStateStore, silentStore, screenSharingAvailableStore],
    ([$peerSizeStore, $followStateStore, $silentStore, $screenSharingAvailableStore]) => {
        return $peerSizeStore > 0 && (!$silentStore || $followStateStore != "off" || $screenSharingAvailableStore);
    }
);
