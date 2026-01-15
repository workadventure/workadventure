import { writable } from "svelte/store";

export const currentPlayerAreaLockStateStore = writable<boolean | undefined>(undefined);
export const currentPlayerAreaIdStore = writable<string | undefined>(undefined);
// Store the property ID for the lockable area property
export const currentPlayerAreaPropertyIdStore = writable<string | undefined>(undefined);
// Store to force reactivity when area properties change
export const areaPropertiesUpdateTriggerStore = writable<number>(0);

