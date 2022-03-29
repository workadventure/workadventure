import { writable } from "svelte/store";

export const currentPlayerGroupLockStateStore = writable<boolean | undefined>(undefined);
