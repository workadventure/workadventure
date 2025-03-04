import { derived } from "svelte/store";
import { followStateStore } from "./FollowStore";
import { silentStore } from "./MediaStore";
import { screenSharingAvailableStore } from "./ScreenSharingStore";
import { livekitVideoStreamSizeStore, peerSizeStore } from "./PeerStore";
export const bottomActionBarVisibilityStore = derived(
    [peerSizeStore, livekitVideoStreamSizeStore, followStateStore, silentStore, screenSharingAvailableStore],
    ([$peerSizeStore, $livekitVideoStreamSizeStore, $followStateStore, $silentStore, $screenSharingAvailableStore]) => {
        return (
            ($peerSizeStore > 0 || $livekitVideoStreamSizeStore > 0) &&
            (!$silentStore || $followStateStore != "off" || $screenSharingAvailableStore)
        );
    }
);
