import { writable } from "svelte/store";

/**
 * Whether the local player's movement is intentionally locked (e.g. on mobile, to
 * avoid a stray tap walking the avatar out of a conversation).
 *
 * This is transient on purpose: it is not persisted and is reset whenever a new
 * game scene is created (reload / room change), to avoid the "why can't I move?!"
 * trap of a lock the user forgot they enabled.
 */
function createMovementLockedStore() {
    const { subscribe, set, update } = writable(false);
    return {
        subscribe,
        lock: () => set(true),
        unlock: () => set(false),
        toggle: () => update((locked) => !locked),
    };
}

export const movementLockedStore = createMovementLockedStore();
