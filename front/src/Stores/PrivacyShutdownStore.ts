import { get, writable } from "svelte/store";
import { peerStore } from "./PeerStore";
import { visibilityStore } from "./VisibilityStore";

/**
 * A store that contains "true" if the webcam should be stopped for privacy reasons - i.e. if the the user left the the page while not in a discussion.
 */
function createPrivacyShutdownStore() {
    let privacyEnabled = false;

    const { subscribe, set, update } = writable(privacyEnabled);

    visibilityStore.subscribe((isVisible) => {
        if (!isVisible && get(peerStore).size === 0) {
            privacyEnabled = true;
            set(true);
        }
        if (isVisible) {
            privacyEnabled = false;
            set(false);
        }
    });

    peerStore.subscribe((peers) => {
        if (peers.size === 0 && get(visibilityStore) === false) {
            privacyEnabled = true;
            set(true);
        }
    });

    return {
        subscribe,
    };
}

export const privacyShutdownStore = createPrivacyShutdownStore();
