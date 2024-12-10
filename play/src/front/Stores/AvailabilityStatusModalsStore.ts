import { writable } from "svelte/store";
const createNamePlayerInBubbleModalStore = () => {
    const { subscribe, set } = writable("");

    return {
        subscribe,
        set,
    };
};
export const namePlayerInBubbleModalStore = createNamePlayerInBubbleModalStore();
