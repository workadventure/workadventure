import { writable, derived } from "svelte/store";
import type { Readable } from "svelte/store";
import type { AreaPropertyVariablesManager } from "../Phaser/Game/AreaPropertyVariablesManager";

/**
 * Store that holds the AreaPropertyVariablesManager instance.
 * Set when the GameScene is initialized.
 */
export const areaPropertyVariablesManagerStore = writable<AreaPropertyVariablesManager | undefined>(undefined);

/**
 * Derived store that provides the current lock state for a specific area/property.
 * Returns undefined if no manager is set or the variable doesn't exist.
 *
 * Usage:
 * ```svelte
 * $: lockState = getAreaPropertyLockState(areaId, propertyId);
 * ```
 */
export function getAreaPropertyVariable(areaId: string, propertyId: string, key: string): Readable<unknown> {
    return derived(areaPropertyVariablesManagerStore, ($manager) => {
        if (!$manager) {
            return undefined;
        }
        return $manager.getVariable(areaId, propertyId, key);
    });
}

/**
 * Helper to get the lock state for a lockable area property.
 *
 * @param areaId - The area ID
 * @param propertyId - The lockable property ID
 * @returns A readable store with the lock state (boolean or undefined)
 */
export function getAreaPropertyLockState(areaId: string, propertyId: string): Readable<boolean | undefined> {
    return derived(areaPropertyVariablesManagerStore, ($manager) => {
        if (!$manager) {
            return undefined;
        }
        const value = $manager.getVariable(areaId, propertyId, "lock");
        if (value === undefined) {
            return undefined;
        }
        return Boolean(value);
    });
}

/**
 * Helper function to set an area property variable.
 * This is a convenience function that gets the manager from the store and calls setVariable.
 *
 * @param areaId - The area ID
 * @param propertyId - The property ID
 * @param key - The variable key
 * @param value - The value to set
 */
export function setAreaPropertyVariable(areaId: string, propertyId: string, key: string, value: unknown): void {
    const currentManager = getCurrentManager();
    if (!currentManager) {
        console.warn("AreaPropertyVariablesManager not initialized, cannot set variable");
        return;
    }
    currentManager.setVariable(areaId, propertyId, key, value);
}

/**
 * Helper function to set the lock state for a lockable area property.
 *
 * @param areaId - The area ID
 * @param propertyId - The lockable property ID
 * @param locked - Whether to lock (true) or unlock (false)
 */
export function setAreaPropertyLockState(areaId: string, propertyId: string, locked: boolean): void {
    setAreaPropertyVariable(areaId, propertyId, "lock", locked);
}

// Helper to get current manager value
function getCurrentManager(): AreaPropertyVariablesManager | undefined {
    let manager: AreaPropertyVariablesManager | undefined;
    const unsubscribe = areaPropertyVariablesManagerStore.subscribe((m) => {
        manager = m;
    });
    unsubscribe();
    return manager;
}
