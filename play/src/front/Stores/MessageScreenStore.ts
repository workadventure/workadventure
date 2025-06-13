import { writable } from "svelte/store";

interface Message {
    title: string;
    subtitle?: string;
}

function createMessageScreenStore() {
    const { subscribe, set } = writable<Message | null>(null);

    return {
        subscribe,
        show: (title: string, subtitle?: string) => set({ title, subtitle }),
        hide: () => set(null),
    };
}

export const messageScreenStore = createMessageScreenStore();
