import { writable } from "svelte/store";

export interface LockableAreaEntry {
    areaId: string;
    propertyId: string;
    lockState: boolean;
    areaName: string;
}

/** All lockable areas the player is currently inside. Used for multi-zone lock UI and picker. */
export const currentPlayerLockableAreasStore = writable<LockableAreaEntry[]>([]);

/** Store to force reactivity when area properties change (e.g. allowedTags). */
export const areaPropertiesUpdateTriggerStore = writable<number>(0);
