import { derived, writable } from "svelte/store";
import { obtainedMediaConstraintStore } from "./MediaStore";

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

/**
 * The "apparent media constraint store" represents what the OTHER users see as the media constraint for this user.
 * It is used to display / hide the webcam or the muted sound icon.
 *
 * It is based on the "obtained media constraint store" (so whether the user is really streaming or not)
 * but it adds on top of it the fact that the user could be sending a sound in the bubbles (via the scripting API)
 * If the user sends a sound, the "audio" is turn on.
 */
export const apparentMediaContraintStore = derived(
    [obtainedMediaConstraintStore, nbSoundPlayedInBubbleStore],
    ([$obtainedMediaConstraintStore, $nbSoundPlayedInBubbleStore]) => {
        return {
            ...$obtainedMediaConstraintStore,
            audio: $obtainedMediaConstraintStore.audio || $nbSoundPlayedInBubbleStore > 0,
        };
    }
);
