import { writable } from "svelte/store";

export interface Emoji {
    unicode: string;
    url: string;
    name: string;
}

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

export const emoteStore = writable<Emoji | null>(null);
export const emoteMenuStore = createEmoteMenuStore();
