import { UserData } from "@workadventure/messages";
import { get, writable } from "svelte/store";

function createUserStore() {
    const { subscribe, update, set } = writable<UserData>();

    return {
        subscribe,
        update,
        set,
        get: () => get(userStore),
    };
}

export const userStore = createUserStore();
