import { get, writable } from "svelte/store";
import { videoStreamElementsStore, activePictureInPictureStore } from "./PeerStore";
import { isLiveStreamingStore } from "./IsStreamingStore";
import { focusStore } from "./FocusStore";
import { currentPlayerGroupIdStore } from "./CurrentPlayerGroupStore";

/**
 * "true" when the webcam should be stopped for privacy reasons — i.e. the user has left the page
 * AND is not engaged with anyone.
 *
 * "Engaged with anyone" covers:
 *  - the main window is focused
 *  - the desktop PiP utility window is open (user is actively watching/controlling the call)
 *  - a proximity bubble has formed (someone is with the user, even before media flows)
 *  - peers are publishing video (covers active LiveKit room when tracks have subscribed)
 *  - a live stream is running
 *
 * NOTE: we deliberately import LEAF stores (currentPlayerGroupIdStore) rather than
 * `isInActiveConversationStore` from StreamableCollectionStore. The latter would close a
 * circular import chain (PrivacyShutdownStore → StreamableCollectionStore → ScreenSharingStore →
 * MediaStore → PrivacyShutdownStore) and trigger a TDZ on `isSpeakerStore` at module load.
 * `inLivekitStore` lives in MediaStore itself, so we omit it for the same reason — when LiveKit
 * has subscribed tracks the videoStreamElementsStore branch already keeps privacy off.
 */
function createPrivacyShutdownStore() {
    const { subscribe, set } = writable(false);
    let current = false;

    function recompute() {
        if (get(focusStore)) {
            return apply(false);
        }
        if (get(activePictureInPictureStore)) {
            return apply(false);
        }
        if (get(currentPlayerGroupIdStore) !== undefined) {
            return apply(false);
        }
        if (get(videoStreamElementsStore).length > 0) {
            return apply(false);
        }
        if (get(isLiveStreamingStore)) {
            return apply(false);
        }
        apply(true);
    }

    function apply(next: boolean) {
        if (next === current) return;
        current = next;
        set(next);
    }

    // Singletons — ok to not unsubscribe.
    /* eslint-disable svelte/no-ignored-unsubscribe */
    focusStore.subscribe(recompute);
    activePictureInPictureStore.subscribe(recompute);
    currentPlayerGroupIdStore.subscribe(recompute);
    videoStreamElementsStore.subscribe(recompute);
    isLiveStreamingStore.subscribe(recompute);
    /* eslint-enable svelte/no-ignored-unsubscribe */

    return { subscribe };
}

export const privacyShutdownStore = createPrivacyShutdownStore();
