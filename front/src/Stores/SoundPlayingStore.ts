import { writable } from "svelte/store";

/**
 * A store that contains the URL of the sound currently playing
 */
function createSoundPlayingStore() {
    const { subscribe, set } = writable<string | null>(null);

    return {
        subscribe,
        playSound: (url: string) => {
            set(url);
        },
        soundEnded: () => {
            set(null);
        },
    };
}

export const soundPlayingStore = createSoundPlayingStore();
