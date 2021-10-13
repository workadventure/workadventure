import { writable } from "svelte/store";

function createEmoteMenuStore() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        openEmoteMenu() {
            set(true);
        },
        closeEmoteMenu() {
            set(false);
        },
    };
}

export const emoteStore = writable<string | null>(null);
export const emoteMenuStore = createEmoteMenuStore();
