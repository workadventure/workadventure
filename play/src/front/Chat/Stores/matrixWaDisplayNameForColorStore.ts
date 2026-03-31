import { writable } from "svelte/store";

/**
 * Last WorkAdventure display name used for chat UI background color (from Matrix account_data + local sync).
 * Only the logged-in user: peers use {@link fetchWaDisplayNameFromUserAccountDataRemote} + session cache in directMessageAvatar.
 */
export const matrixWaDisplayNameForColorStore = writable<string | undefined>(undefined);
