import { writable } from "svelte/store";

/** True while normal navigation has detached the camera from the player's avatar. */
export const cameraDetachedStore = writable(false);
