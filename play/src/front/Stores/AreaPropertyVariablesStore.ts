import { writable } from "svelte/store";
import type { AreaPropertyVariablesManager } from "../Phaser/Game/AreaPropertyVariablesManager";

/**
 * Store that holds the AreaPropertyVariablesManager instance.
 * Set when the GameScene is initialized.
 */
export const areaPropertyVariablesManagerStore = writable<AreaPropertyVariablesManager | undefined>(undefined);

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
