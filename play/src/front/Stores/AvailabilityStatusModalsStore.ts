import { writable } from "svelte/store";
const createNamePlayerInBubbleModalStore = () => {
    const { subscribe, set } = writable("");

    return {
        subscribe,
        set,
    };
};
export const namePlayerInBubbleModalStore = createNamePlayerInBubbleModalStore();
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

const createNotificationPermissionModal = () => {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        open: () => set(true),
        close: () => set(false),
    };
};

export const notificationPermissionModalVisibility = createNotificationPermissionModal();
export const changeStatusConfirmationModalVisibility = createConfirmationModalVisibilityStore();
export const bubbleModalVisibility = createBubbleModalVisibilityStore();
