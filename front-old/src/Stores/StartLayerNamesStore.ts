import { writable } from "svelte/store";

/**
 * A store that contains the map starting layers names
 */
export const startLayerNamesStore = writable<string[]>([]);
