import { writable, get } from "svelte/store";
import type { Writable } from "svelte/store";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { AreaPropertyVariable } from "../../Connection/ConnexionModels";

/**
 * Builds a composite key from the variable components.
 */
function buildCompositeKey(areaId: string, propertyId: string, key: string): string {
    return `${areaId}.${propertyId}.${key}`;
}

export interface AreaPropertyVariableChange {
    areaId: string;
    propertyId: string;
    key: string;
    value: unknown;
}

/**
 * Manages ephemeral variables attached to area properties.
 * These variables are synchronized with the server but not persisted.
 */
export class AreaPropertyVariablesManager {
    /**
     * Internal store for all property variables.
     * Key format: `{areaId}.{propertyId}.{variableKey}`
     */
    private readonly _variables: Writable<Map<string, unknown>>;

    /**
     * Store that emits every time a variable changes, with the change details.
     * Components can subscribe to this to react to specific changes.
     */
    private readonly _variableChanges: Writable<AreaPropertyVariableChange | undefined>;

    constructor(
        private roomConnection: RoomConnection,
        initialVariables: AreaPropertyVariable[]
    ) {
        // Initialize the variables map from server data
        const variablesMap = new Map<string, unknown>();
        for (const variable of initialVariables) {
            const compositeKey = buildCompositeKey(variable.areaId, variable.propertyId, variable.key);
            variablesMap.set(compositeKey, variable.value);
        }
        this._variables = writable(variablesMap);
        this._variableChanges = writable(undefined);

        // Subscribe to variable changes from the server
        // The stream is completed in RoomConnection, no need to unsubscribe
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        roomConnection.areaPropertyVariableMessageStream.subscribe(({ areaId, propertyId, key, value }) => {
            const compositeKey = buildCompositeKey(areaId, propertyId, key);
            const currentVariables = get(this._variables);

            // Only update if value changed
            if (JSON.stringify(value) === JSON.stringify(currentVariables.get(compositeKey))) {
                return;
            }

            currentVariables.set(compositeKey, value);
            this._variables.set(currentVariables);

            // Emit the change
            this._variableChanges.set({ areaId, propertyId, key, value });
        });
    }

    /**
     * Sets a property variable and sends it to the server.
     *
     * @param areaId - The ID of the area
     * @param propertyId - The ID of the property within the area
     * @param key - The variable key (e.g., "lock")
     * @param value - The value to set
     */
    public setVariable(areaId: string, propertyId: string, key: string, value: unknown): void {
        const compositeKey = buildCompositeKey(areaId, propertyId, key);
        const currentVariables = get(this._variables);

        // Don't send if value hasn't changed
        if (JSON.stringify(value) === JSON.stringify(currentVariables.get(compositeKey))) {
            return;
        }

        // Update local state
        currentVariables.set(compositeKey, value);
        this._variables.set(currentVariables);

        // Send to server
        this.roomConnection.emitSetAreaPropertyVariable(areaId, propertyId, key, value);

        // Emit the change
        this._variableChanges.set({ areaId, propertyId, key, value });
    }

    /**
     * Gets a property variable value.
     *
     * @param areaId - The ID of the area
     * @param propertyId - The ID of the property within the area
     * @param key - The variable key
     * @returns The value or undefined if not set
     */
    public getVariable(areaId: string, propertyId: string, key: string): unknown {
        const compositeKey = buildCompositeKey(areaId, propertyId, key);
        return get(this._variables).get(compositeKey);
    }

    /**
     * Gets a property variable value as a specific type.
     *
     * @param areaId - The ID of the area
     * @param propertyId - The ID of the property within the area
     * @param key - The variable key
     * @param defaultValue - Default value if not set
     * @returns The value or default value
     */
    public getVariableAs<T>(areaId: string, propertyId: string, key: string, defaultValue: T): T {
        const value = this.getVariable(areaId, propertyId, key);
        if (value === undefined) {
            return defaultValue;
        }
        return value as T;
    }

    /**
     * Reactive store for all variables.
     * Subscribe to this to react to any variable change.
     */
    public get variables(): Writable<Map<string, unknown>> {
        return this._variables;
    }

    /**
     * Reactive store for variable changes.
     * Subscribe to this to react to specific variable changes.
     */
    public get variableChanges(): Writable<AreaPropertyVariableChange | undefined> {
        return this._variableChanges;
    }
}
