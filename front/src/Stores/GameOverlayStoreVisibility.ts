import {writable} from "svelte/store";

/**
 * A store that contains whether the game overlay is shown or not.
 * Typically, the overlay is hidden when entering Jitsi meet.
 */
function createGameOverlayVisibilityStore() {
    const { subscribe, set, update } = writable(false);

    return {
        subscribe,
        showGameOverlay: () => set(true),
        hideGameOverlay: () => set(false),
    };
}

export const gameOverlayVisibilityStore = createGameOverlayVisibilityStore();
