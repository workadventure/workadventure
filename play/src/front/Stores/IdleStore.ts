import { writable } from "svelte/store";

/**
 * The user is idle: WorkAdventure has not seen them for a while. A layer over Online and Away, under the statuses the
 * user picks (busy, do not disturb...), never saved: it turns their camera and microphone off until they are back.
 */
export const idleStore = writable(false);
