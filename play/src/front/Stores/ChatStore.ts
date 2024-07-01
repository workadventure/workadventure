import { writable } from "svelte/store";
import { Subject } from "rxjs";

export const chatZoneLiveStore = writable(false);
export const chatVisibilityStore = writable(false);

export const chatInputFocusStore = writable(false);

export const _newChatMessageSubject = new Subject<string>();
export const newChatMessageSubject = _newChatMessageSubject.asObservable();

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
export const INITIAL_SIDEBAR_WIDTH = 335;
