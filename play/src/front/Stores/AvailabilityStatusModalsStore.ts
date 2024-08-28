import { writable } from "svelte/store";
const createNamePlayerInBubbleModalStore = () => {
    const { subscribe, set } = writable("");

    return {
        subscribe,
        set,
    };
};
export const namePlayerInBubbleModalStore = createNamePlayerInBubbleModalStore();

const createBubbleModalVisibilityStore = () => {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        open: (name: string) => {
            namePlayerInBubbleModalStore.set(name);
            set(true);
        },
        close: () => {
            set(false);
            namePlayerInBubbleModalStore.set("");
        },
    };
};

const createBasicBooleanModalStore = () => {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        open: () => set(true),
        close: () => set(false),
    };
};

export const notificationPermissionModalVisibility = createBasicBooleanModalStore();
export const changeStatusConfirmationModalVisibility = createBasicBooleanModalStore();
export const bubbleModalVisibility = createBubbleModalVisibilityStore();
export const recommendedActiveNotification = createBasicBooleanModalStore();
