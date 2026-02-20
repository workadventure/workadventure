import { get, writable } from "svelte/store";
import { videoStreamElementsStore } from "./PeerStore";
import { isLiveStreamingStore } from "./IsStreamingStore";
import { focusStore } from "./FocusStore";

/**
 * A store that contains "true" if the webcam should be stopped for privacy reasons - i.e. if the user leaves the page while not in a discussion.
 */
function createPrivacyShutdownStore() {
    let privacyEnabled = false;

    const { subscribe, set } = writable(privacyEnabled);

    // It is ok to not unsubscribe to this store because it is a singleton.
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    focusStore.subscribe((isVisible) => {
        if (!isVisible && get(videoStreamElementsStore).length === 0 && !get(isLiveStreamingStore)) {
            privacyEnabled = true;
            set(true);
        }
        if (isVisible) {
            privacyEnabled = false;
            set(false);
        }
    });

    // It is ok to not unsubscribe to this store because it is a singleton.
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    videoStreamElementsStore.subscribe((peerElements) => {
        if (peerElements.length === 0 && get(focusStore) === false && !get(isLiveStreamingStore)) {
            privacyEnabled = true;
            set(true);
        }
    });

    return {
        subscribe,
    };
}

export const privacyShutdownStore = createPrivacyShutdownStore();
