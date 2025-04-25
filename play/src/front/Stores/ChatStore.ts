import { writable } from "svelte/store";

export const chatZoneLiveStore = writable(false);
export const chatVisibilityStore = writable(false);
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
export const loginTokenErrorStore = writable(false);
