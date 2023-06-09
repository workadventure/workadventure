import { derived } from "svelte/store";
import { peerStore } from "./PeerStore";
import { followStateStore } from "./FollowStore";
import { silentStore } from "./MediaStore";
import { screenSharingAvailableStore } from "./ScreenSharingStore";

export const bottomActionBarVisibilityStore = derived(
    [peerStore, followStateStore, silentStore, screenSharingAvailableStore],
    ([$peerStore, $followStateStore, $silentStore, $screenSharingAvailableStore]) => {
        return $peerStore.size > 0 && (!$silentStore || $followStateStore != "off" || $screenSharingAvailableStore);
    }
);
