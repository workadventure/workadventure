import { writable } from "svelte/store";

/**
 * A store that contains whether my camera & actions is shown or not.
 * Typically, the overlay is hidden when entering Jitsi meet.
 */

export const myCameraVisibilityStore = writable(false);
