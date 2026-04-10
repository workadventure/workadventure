import { writable } from "svelte/store";

export const currentPlayerGroupLockStateStore = writable<boolean | undefined>(undefined);

/** Set when the user is in a real conversation bubble (from server). Undefined when not in any group. */
export const currentPlayerGroupIdStore = writable<number | undefined>(undefined);
