import { writable } from "svelte/store";

const createConfirmationModalVisibilityStore = () => {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        open: () => set(true),
        close: () => set(false),
    };
};

const createBubbleModalVisibilityStore = () => {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        open: () => set(true),
        close: () => set(false),
    };
};

export const changeStatusConfirmationModalVisibility = createConfirmationModalVisibilityStore();
export const bubbleModalVisibility = createBubbleModalVisibilityStore();
