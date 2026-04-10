import { writable } from "svelte/store";
import { localUserStore } from "../Connection/LocalUserStore";

export const DUPLICATE_USER_DONT_REMIND_KEY = "workadventure_duplicate_user_dont_remind";

/**
 * Returns false if the user chose "don't remind again", so the popup should not be shown.
 */
export function shouldShowDuplicateUserPopup(): boolean {
    try {
        return !localUserStore.getDuplicateUserDontRemind();
    } catch {
        return true;
    }
}

/**
 * Set to true when the back sends duplicateUserConnectedMessage (same user already connected elsewhere).
 * The UI should show a popup. Not shown if user previously chose "don't remind again" (localStorage).
 */
function createDuplicateUserConnectedStore() {
    const { subscribe, set } = writable<boolean>(false);

    return {
        subscribe,
        setDuplicateConnected: (value: boolean): void => {
            set(value);
        },
    };
}

export const duplicateUserConnectedStore = createDuplicateUserConnectedStore();
