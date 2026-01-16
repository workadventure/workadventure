/**
 * Handles ephemeral variables attached to area properties.
 * These variables are stored in memory and not persisted to Redis.
 * They are synchronized between all clients in the room.
 */

export interface AreaPropertyVariableKey {
    areaId: string;
    propertyId: string;
    key: string;
}

export interface AreaPropertyVariable {
    areaId: string;
    propertyId: string;
    key: string;
    value: string;
}

/**
 * Delimiter used for composite keys.
 * Using `::` instead of `.` to avoid parsing issues when areaId, propertyId, or key contains dots.
 */
const COMPOSITE_KEY_DELIMITER = "::";

/**
 * Builds a composite key from the variable components.
 * Uses `::` as delimiter to avoid conflicts with dots in component values.
 */
function buildCompositeKey(areaId: string, propertyId: string, key: string): string {
    return `${areaId}${COMPOSITE_KEY_DELIMITER}${propertyId}${COMPOSITE_KEY_DELIMITER}${key}`;
}

/**
 * Parses a composite key back into its components.
 * Expects exactly 3 parts separated by `::`.
 */
function parseCompositeKey(compositeKey: string): AreaPropertyVariableKey | undefined {
    const parts = compositeKey.split(COMPOSITE_KEY_DELIMITER);
    if (parts.length !== 3) {
        return undefined;
    }
    return {
        areaId: parts[0],
        propertyId: parts[1],
        key: parts[2],
    };
}

export class AreaPropertyVariablesManager {
    /**
     * The actual values of the property variables for the current room.
     * Key format: `{areaId}::{propertyId}::{variableKey}`
     */
    private variables = new Map<string, string>();

    /**
     * Sets a property variable.
     *
     * @param areaId - The ID of the area
     * @param propertyId - The ID of the property within the area
     * @param key - The variable key (e.g., "lock")
     * @param value - The value to set (JSON stringified)
     * @returns false if the value was not modified (same as existing), true otherwise
     */
    public setVariable(areaId: string, propertyId: string, key: string, value: string): boolean {
        const compositeKey = buildCompositeKey(areaId, propertyId, key);

        // If the value is not modified, return false
        if (this.variables.get(compositeKey) === value) {
            return false;
        }

        this.variables.set(compositeKey, value);
        return true;
    }

    /**
     * Gets a property variable value.
     *
     * @param areaId - The ID of the area
     * @param propertyId - The ID of the property within the area
     * @param key - The variable key
     * @returns The value or undefined if not set
     */
    public getVariable(areaId: string, propertyId: string, key: string): string | undefined {
        const compositeKey = buildCompositeKey(areaId, propertyId, key);
        return this.variables.get(compositeKey);
    }

    /**
     * Gets all variables for a specific property.
     *
     * @param areaId - The ID of the area
     * @param propertyId - The ID of the property
     * @returns Map of variable keys to values
     */
    public getVariablesForProperty(areaId: string, propertyId: string): Map<string, string> {
        const prefix = `${areaId}${COMPOSITE_KEY_DELIMITER}${propertyId}${COMPOSITE_KEY_DELIMITER}`;
        const result = new Map<string, string>();

        for (const [compositeKey, value] of this.variables.entries()) {
            if (compositeKey.startsWith(prefix)) {
                const key = compositeKey.substring(prefix.length);
                result.set(key, value);
            }
        }

        return result;
    }

    /**
     * Gets all variables for a specific area.
     *
     * @param areaId - The ID of the area
     * @returns Array of property variables
     */
    public getVariablesForArea(areaId: string): AreaPropertyVariable[] {
        const prefix = `${areaId}${COMPOSITE_KEY_DELIMITER}`;
        const result: AreaPropertyVariable[] = [];

        for (const [compositeKey, value] of this.variables.entries()) {
            if (compositeKey.startsWith(prefix)) {
                const parsed = parseCompositeKey(compositeKey);
                if (parsed) {
                    result.push({
                        areaId: parsed.areaId,
                        propertyId: parsed.propertyId,
                        key: parsed.key,
                        value,
                    });
                }
            }
        }

        return result;
    }

    /**
     * Gets all property variables in the room.
     *
     * @returns Array of all property variables
     */
    public getAllVariables(): AreaPropertyVariable[] {
        const result: AreaPropertyVariable[] = [];

        for (const [compositeKey, value] of this.variables.entries()) {
            const parsed = parseCompositeKey(compositeKey);
            if (parsed) {
                result.push({
                    areaId: parsed.areaId,
                    propertyId: parsed.propertyId,
                    key: parsed.key,
                    value,
                });
            }
        }

        return result;
    }

    /**
     * Deletes a property variable.
     *
     * @param areaId - The ID of the area
     * @param propertyId - The ID of the property
     * @param key - The variable key
     * @returns true if the variable existed and was deleted, false otherwise
     */
    public deleteVariable(areaId: string, propertyId: string, key: string): boolean {
        const compositeKey = buildCompositeKey(areaId, propertyId, key);
        return this.variables.delete(compositeKey);
    }

    /**
     * Clears all variables for a specific property.
     *
     * @param areaId - The ID of the area
     * @param propertyId - The ID of the property
     */
    public clearPropertyVariables(areaId: string, propertyId: string): void {
        const prefix = `${areaId}${COMPOSITE_KEY_DELIMITER}${propertyId}${COMPOSITE_KEY_DELIMITER}`;

        for (const compositeKey of this.variables.keys()) {
            if (compositeKey.startsWith(prefix)) {
                this.variables.delete(compositeKey);
            }
        }
    }

    /**
     * Clears all variables for a specific area.
     *
     * @param areaId - The ID of the area
     */
    public clearAreaVariables(areaId: string): void {
        const prefix = `${areaId}${COMPOSITE_KEY_DELIMITER}`;

        for (const compositeKey of this.variables.keys()) {
            if (compositeKey.startsWith(prefix)) {
                this.variables.delete(compositeKey);
            }
        }
    }
}
