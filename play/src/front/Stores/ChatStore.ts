import { writable } from "svelte/store";
import { analyticsClient } from "../Administration/AnalyticsClient";

export const chatZoneLiveStore = writable(false);
export const chatVisibilityStore = writable(false);

// How long the panel stays open, reported from the store rather than from the chat
// button: roughly ten other things open it — a proximity conversation starting, a
// notification, a map property, an area — and only four of them are that button.
// This is a singleton so we can safely not ever unsubscribe from it.
// eslint-disable-next-line svelte/no-ignored-unsubscribe
chatVisibilityStore.subscribe((visible) => {
    analyticsClient.chatPanelVisibilityChanged(visible);
});
export const chatInputFocusStore = writable(false);

// Call "forceRefresh" to force the refresh of the chat iframe.
function createForceRefreshChatStore() {
    const { subscribe, update } = writable({});
    return {
        subscribe,
        forceRefresh() {
            update((list) => {
                return {};
            });
        },
    };
}
export const forceRefreshChatStore = createForceRefreshChatStore();

export const isMatrixChatEnabledStore = writable(false);

export const INITIAL_SIDEBAR_WIDTH = 335;
export const INITIAL_SIDEBAR_WIDTH_MOBILE = 250;
export const loginTokenErrorStore = writable(false);
