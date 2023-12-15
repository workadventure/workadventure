import type { ITiledMapLayer, ITiledMapObject } from "@workadventure/tiled-map-type-guard";
import { GameMapProperties } from "@workadventure/map-editor";
import type { RoomConnection } from "../../Connection/RoomConnection";
import { iframeListener } from "../../Api/IframeListener";
import type { SetVariableEvent } from "../../Api/Events/SetVariableEvent";
import type { GameMapFrontWrapper } from "./GameMap/GameMapFrontWrapper";

interface Variable {
    defaultValue: unknown;
    readableBy?: string;
    writableBy?: string;
}

/**
 * Stores variables and provides a bridge between scripts and the pusher server.
 */
export class SharedVariablesManager {
    private _variables = new Map<string, unknown>();
    private variableObjects: Map<string, Variable>;

    constructor(
        private roomConnection: RoomConnection,
        private gameMapFrontWrapper: GameMapFrontWrapper,
        serverVariables: Map<string, unknown>
    ) {
        // We initialize the list of variable object at room start. The objects cannot be edited later
        // (otherwise, this would cause a security issue if the scripting API can edit this list of objects)
        this.variableObjects = SharedVariablesManager.findVariablesInMap(gameMapFrontWrapper);

        // Let's initialize default values
        for (const [name, variableObject] of this.variableObjects.entries()) {
            if (variableObject.readableBy && !this.roomConnection.hasTag(variableObject.readableBy)) {
                // Do not initialize default value for variables that are not readable
                continue;
            }

            this._variables.set(name, variableObject.defaultValue);
        }

        // Override default values with the variables from the server:
        for (const [name, value] of serverVariables) {
            this._variables.set(name, value);
        }

        // The variableMessageStream stream is completed in the RoomConnection. No need to unsubscribe.
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        roomConnection.variableMessageStream.subscribe(({ name, value }) => {
            if (JSON.stringify(value) === JSON.stringify(this._variables.get(name))) {
                return;
            }

            this._variables.set(name, value);

            // On server change, let's notify the iframes
            iframeListener.setVariable({
                key: name,
                value: value,
            });
        });
    }

    public setVariable(event: SetVariableEvent, source: MessageEventSource | null): void {
        const key = event.key;

        const object = this.variableObjects.get(key);

        if (object === undefined) {
            const errMsg =
                'A script is trying to modify variable "' +
                key +
                '" but this variable is not defined in the map.' +
                'There should be an object in the map whose name is "' +
                key +
                '" and whose type is "variable"';
            console.error(errMsg);
            throw new Error(errMsg);
        }

        if (object.writableBy && !this.roomConnection.hasTag(object.writableBy)) {
            const errMsg =
                'A script is trying to modify variable "' +
                key +
                '" but this variable is only writable for users with tag "' +
                object.writableBy +
                '".';
            console.error(errMsg);
            throw new Error(errMsg);
        }

        // Let's stop any propagation of the value we set is the same as the existing value.
        if (JSON.stringify(event.value) === JSON.stringify(this._variables.get(key))) {
            return;
        }

        this._variables.set(key, event.value);

        // Dispatch to the room connection.
        this.roomConnection.emitSetVariableEvent(key, event.value);

        // Dispatch to other iframes
        iframeListener.dispatchVariableToOtherIframes(key, event.value, source);
    }

    private static findVariablesInMap(gameMapFrontWrapper: GameMapFrontWrapper): Map<string, Variable> {
        const objects = new Map<string, Variable>();
        for (const layer of gameMapFrontWrapper.getMap().layers) {
            this.recursiveFindVariablesInLayer(layer, objects);
        }
        return objects;
    }

    private static recursiveFindVariablesInLayer(layer: ITiledMapLayer, objects: Map<string, Variable>): void {
        if (layer.type === "objectgroup") {
            for (const object of layer.objects) {
                if (object.class === "variable") {
                    if (object.template) {
                        console.warn(
                            'Warning, a variable object is using a Tiled "template". WorkAdventure does not support objects generated from Tiled templates.'
                        );
                        continue;
                    }

                    // We store a copy of the object (to make it immutable)
                    objects.set(object.name, this.iTiledObjectToVariable(object));
                }
            }
        } else if (layer.type === "group") {
            for (const innerLayer of layer.layers) {
                this.recursiveFindVariablesInLayer(innerLayer, objects);
            }
        }
    }

    private static iTiledObjectToVariable(object: ITiledMapObject): Variable {
        const variable: Variable = {
            defaultValue: undefined,
        };

        if (object.properties) {
            for (const property of object.properties) {
                const value = property.value;
                switch (property.name) {
                    case GameMapProperties.DEFAULT:
                        variable.defaultValue = value;
                        break;
                    case GameMapProperties.WRITABLE_BY:
                        if (typeof value !== "string") {
                            throw new Error(
                                'The writableBy property of variable "' + object.name + '" must be a string'
                            );
                        }
                        if (value) {
                            variable.writableBy = value;
                        }
                        break;
                    case GameMapProperties.READABLE_BY:
                        if (typeof value !== "string") {
                            throw new Error(
                                'The readableBy property of variable "' + object.name + '" must be a string'
                            );
                        }
                        if (value) {
                            variable.readableBy = value;
                        }
                        break;
                }
            }
        }

        return variable;
    }

    public close(): void {
        iframeListener.unregisterAnswerer("setVariable");
    }

    get variables(): Map<string, unknown> {
        return this._variables;
    }
}
