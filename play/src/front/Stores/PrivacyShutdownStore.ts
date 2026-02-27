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
    focusStore.subscribe((hasFocus) => {
        const peerCount = get(videoStreamElementsStore).length;
        const isLiveStreaming = get(isLiveStreamingStore);
        console.log("[privacyShutdown] focusStore.subscribe", {
            hasFocus,
            peerCount,
            isLiveStreaming,
        });
        if (!hasFocus && peerCount === 0 && !isLiveStreaming) {
            privacyEnabled = true;
            console.log("[privacyShutdown] focusStore: set(true) — no focus, no peers, not live");
            set(true);
        }
        if (hasFocus) {
            privacyEnabled = false;
            console.log("[privacyShutdown] focusStore: set(false) — has focus");
            set(false);
        }
    });

    // It is ok to not unsubscribe to this store because it is a singleton.
    // eslint-disable-next-line svelte/no-ignored-unsubscribe
    videoStreamElementsStore.subscribe((peerElements) => {
        const hasFocus = get(focusStore);
        const isLiveStreaming = get(isLiveStreamingStore);
        console.log("[privacyShutdown] videoStreamElementsStore.subscribe", {
            peerCount: peerElements.length,
            hasFocus,
            isLiveStreaming,
        });
        if (peerElements.length === 0 && hasFocus === false && !isLiveStreaming) {
            privacyEnabled = true;
            console.log("[privacyShutdown] videoStreamElements: set(true) — no peers, no focus, not live");
            set(true);
        }
    });

    return {
        subscribe,
    };
}

export const privacyShutdownStore = createPrivacyShutdownStore();
