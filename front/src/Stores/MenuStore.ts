import { writable } from "svelte/store";
import Timeout = NodeJS.Timeout;

export const menuIconVisiblilityStore = writable(false);
export const menuVisiblilityStore = writable(false);
export const menuInputFocusStore = writable(false);

let warningContainerTimeout: Timeout | null = null;
function createWarningContainerStore() {
    const { subscribe, set } = writable<boolean>(false);

    return {
        subscribe,
        activateWarningContainer() {
            set(true);
            if (warningContainerTimeout) clearTimeout(warningContainerTimeout);
            warningContainerTimeout = setTimeout(() => {
                set(false);
                warningContainerTimeout = null;
            }, 120000);
        },
    };
}

export const warningContainerStore = createWarningContainerStore();
