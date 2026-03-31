import { writable } from "svelte/store";

/**
 * Last WorkAdventure display name used for chat UI background color (from Matrix account_data + local sync).
 * Only meaningful for the logged-in Matrix user (others still use merger / cache in resolveChatUserColorWithCache).
 */
export const matrixWaDisplayNameForColorStore = writable<string | undefined>(undefined);
