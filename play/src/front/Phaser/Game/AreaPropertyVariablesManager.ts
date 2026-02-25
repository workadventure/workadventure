import { writable, get } from "svelte/store";
import type { Readable, Writable } from "svelte/store";
import type { Subscription } from "rxjs";
import { isEqual } from "lodash";
import type { RoomConnection } from "../../Connection/RoomConnection";
import type { AreaPropertyVariable } from "../../Connection/ConnexionModels";

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
     * Key format: `{areaId}::{propertyId}::{variableKey}`
     */
    private readonly _variables: Writable<Map<string, unknown>>;

    /**
     * Store that emits every time a variable changes, with the change details.
     * Components can subscribe to this to react to specific changes.
     */
    private readonly _variableChanges: Writable<AreaPropertyVariableChange | undefined>;

    /**
     * Subscription to the server's variable change stream.
     */
    private readonly _serverSubscription: Subscription;

    constructor(private roomConnection: RoomConnection, initialVariables: AreaPropertyVariable[]) {
        // Initialize the variables map from server data
        const variablesMap = new Map<string, unknown>();
        for (const variable of initialVariables) {
            const compositeKey = buildCompositeKey(variable.areaId, variable.propertyId, variable.key);
            variablesMap.set(compositeKey, variable.value);
        }
        this._variables = writable(variablesMap);
        this._variableChanges = writable(undefined);

        // Subscribe to variable changes from the server
        this._serverSubscription = roomConnection.areaPropertyVariableMessageStream.subscribe(
            ({ areaId, propertyId, key, value }) => {
                const compositeKey = buildCompositeKey(areaId, propertyId, key);
                const currentVariables = get(this._variables);

                // Only update if value changed
                if (isEqual(value, currentVariables.get(compositeKey))) {
                    return;
                }

                currentVariables.set(compositeKey, value);
                this._variables.set(currentVariables);

                // Emit the change
                this._variableChanges.set({ areaId, propertyId, key, value });
            }
        );
    }

    /**
     * Cleans up subscriptions and resources.
     * Must be called when the manager is no longer needed to prevent memory leaks.
     */
    public destroy(): void {
        this._serverSubscription.unsubscribe();
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
        if (isEqual(value, currentVariables.get(compositeKey))) {
            return;
        }

        // Send to server
        this.roomConnection.emitSetAreaPropertyVariable(areaId, propertyId, key, value);
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
        const variables = get(this._variables);
        if (!variables.has(compositeKey)) {
            return undefined;
        }
        const returnValue = variables.get(compositeKey);
        return returnValue;
    }

    /**
     * Reactive store for variable changes.
     * Subscribe to this to react to specific variable changes.
     */
    public get variableChanges(): Readable<AreaPropertyVariableChange | undefined> {
        return this._variableChanges;
    }
}
