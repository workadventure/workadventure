import { writable } from "svelte/store";

export const currentPlayerGroupIdStore = writable<number | undefined>(undefined);
export const currentPlayerGroupLockStateStore = writable<boolean | undefined>(undefined);
