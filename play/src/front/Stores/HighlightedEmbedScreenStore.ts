import { writable } from "svelte/store";
import type { Unsubscriber } from "svelte/store";
import type { VideoBox } from "../Space/Space";

function createHighlightedEmbedScreenStore() {
    const { subscribe, set } = writable<VideoBox | undefined>(undefined);
    let streamableUnsubscriber: Unsubscriber | undefined;
    let hasVideoUnsubscriber: Unsubscriber | undefined;

    return {
        subscribe,
        highlight: (embedScreen: VideoBox) => {
            // Clean up previous subscriptions
            if (streamableUnsubscriber) {
                streamableUnsubscriber();
                streamableUnsubscriber = undefined;
            }
            if (hasVideoUnsubscriber) {
                hasVideoUnsubscriber();
                hasVideoUnsubscriber = undefined;
            }

            set(embedScreen);

            // Subscribe to the streamable store
            streamableUnsubscriber = embedScreen.streamable.subscribe((streamable) => {
                // Clean up previous hasVideo subscription
                if (hasVideoUnsubscriber) {
                    hasVideoUnsubscriber();
                    hasVideoUnsubscriber = undefined;
                }

                if (streamable) {
                    // Subscribe to hasVideo changes
                    let firstSubscribe = true;
                    hasVideoUnsubscriber = streamable.hasVideo.subscribe((hasVideo) => {
                        if (firstSubscribe) {
                            // Skip the first subscription because we might not yet have received the video.
                            firstSubscribe = false;
                            return;
                        }
                        if (!hasVideo) {
                            // If hasVideo becomes false, remove the highlight
                            set(undefined);
                            if (streamableUnsubscriber) {
                                streamableUnsubscriber();
                                streamableUnsubscriber = undefined;
                            }
                            if (hasVideoUnsubscriber) {
                                hasVideoUnsubscriber();
                                hasVideoUnsubscriber = undefined;
                            }
                        }
                    });
                }
            });
        },
        removeHighlight: () => {
            // Clean up subscriptions
            if (streamableUnsubscriber) {
                streamableUnsubscriber();
                streamableUnsubscriber = undefined;
            }
            if (hasVideoUnsubscriber) {
                hasVideoUnsubscriber();
                hasVideoUnsubscriber = undefined;
            }
            set(undefined);
        },
    };
}

export const highlightedEmbedScreen = createHighlightedEmbedScreenStore();
