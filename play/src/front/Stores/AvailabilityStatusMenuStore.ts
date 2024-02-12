import { writable } from "svelte/store";

function createAvailabilityStatusMenuStore() {
    const { subscribe, set } = writable(false);

    return {
        subscribe,
        openAvailabilityStatusMenu() {
            set(true);
        },
        closeAvailabilityStatusMenu() {
            set(false);
        },
    };
}

export const availabilityStatusMenuStore = createAvailabilityStatusMenuStore();
