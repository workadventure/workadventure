import { get, writable } from "svelte/store";
import { videoStreamElementsStore } from "./PeerStore";
import { isLiveStreamingStore } from "./IsStreamingStore";
import { focusStore } from "./FocusStore";
import { currentPlayerGroupIdStore } from "./CurrentPlayerGroupStore";

/**
 * "true" when the webcam should be stopped for privacy reasons — i.e. the user has left the page
 * AND is not engaged with anyone.
 *
 * "Engaged with anyone" covers:
 *  - the main window is focused
 *  - the user came back from the mini window (`comeBack()`), until they switch windows or the conversation ends
 *  - a proximity bubble has formed (someone is with the user, even before media flows)
 *  - peers are publishing video (covers active LiveKit room when tracks have subscribed)
 *  - a live stream is running
 *
 * Only focus and `comeBack()` can turn privacy OFF once it is on; the last three only keep it off while the
 * user leaves. An open mini window does not: it pops up while the user may be away from their desk.
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
    let cameBack = false;
    let wasEngaged = false;

    function recompute() {
        const engaged =
            get(currentPlayerGroupIdStore) !== undefined ||
            get(videoStreamElementsStore).length > 0 ||
            get(isLiveStreamingStore);
        // The conversation the user came back for is over.
        if (wasEngaged && !engaged) cameBack = false;
        wasEngaged = engaged;

        if (get(focusStore) || cameBack) {
            return apply(false);
        }
        // Once the camera is off for privacy, only coming back turns it on again. Otherwise someone walking up
        // to an AWAY user would switch their camera back on.
        if (current) {
            return;
        }
        apply(!engaged);
    }

    function apply(next: boolean) {
        if (next === current) return;
        current = next;
        set(next);
    }

    // Singletons — ok to not unsubscribe.
    /* eslint-disable svelte/no-ignored-unsubscribe */
    focusStore.subscribe(() => {
        // Switching windows ends a comeback: the main window decides again.
        cameBack = false;
        recompute();
    });
    currentPlayerGroupIdStore.subscribe(recompute);
    videoStreamElementsStore.subscribe(recompute);
    isLiveStreamingStore.subscribe(recompute);
    /* eslint-enable svelte/no-ignored-unsubscribe */

    return {
        subscribe,
        /** The user, still in another app, asked to be seen and heard (from the mini window). */
        comeBack() {
            cameBack = true;
            recompute();
        },
    };
}

export const privacyShutdownStore = createPrivacyShutdownStore();
