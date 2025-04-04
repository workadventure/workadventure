import { derived } from "svelte/store";
import { followStateStore } from "./FollowStore";
import { silentStore } from "./MediaStore";
import { screenSharingAvailableStore } from "./ScreenSharingStore";
import { livekitVideoStreamElementsStore, peerElementsStore } from "./PeerStore";
export const bottomActionBarVisibilityStore = derived(
    [peerElementsStore, livekitVideoStreamElementsStore, followStateStore, silentStore, screenSharingAvailableStore],
    ([$peerElementsStore, $livekitVideoStreamElementsStore, $followStateStore, $silentStore, $screenSharingAvailableStore]) => {
        return (
            ($peerElementsStore.length > 0 || $livekitVideoStreamElementsStore.length > 0) &&
            (!$silentStore || $followStateStore != "off" || $screenSharingAvailableStore)
        );
    }

);
