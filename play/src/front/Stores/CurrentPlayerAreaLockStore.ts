import { writable } from "svelte/store";

export const currentPlayerAreaLockStateStore = writable<boolean | undefined>(undefined);
export const currentPlayerAreaIdStore = writable<string | undefined>(undefined);
// Store to force reactivity when area properties change
export const areaPropertiesUpdateTriggerStore = writable<number>(0);

