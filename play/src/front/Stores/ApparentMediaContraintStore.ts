import { writable } from "svelte/store";

/**
 * A store that contains the camera state requested by the user (on or off).
 */
function createNbSoundPlayedInBubbleStore() {
    const { subscribe, update } = writable(0);

    return {
        subscribe,
        soundStarted: () => {
            update((n) => n + 1);
        },
        soundEnded: () => {
            update((n) => n - 1);
        },
    };
}
export const nbSoundPlayedInBubbleStore = createNbSoundPlayedInBubbleStore();

export interface INbSoundPlayedInBubbleStore {
    subscribe: (fn: (value: number) => void) => void;
    soundStarted: () => void;
    soundEnded: () => void;
}
