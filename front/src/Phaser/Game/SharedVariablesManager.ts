/**
 * Handles variables shared between the scripting API and the server.
 */
import type {RoomConnection} from "../../Connexion/RoomConnection";
import {iframeListener} from "../../Api/IframeListener";
import type {Subscription} from "rxjs";
import type {GameMap} from "./GameMap";
import type {ITile, ITiledMapObject} from "../Map/ITiledMap";
import type {Var} from "svelte/types/compiler/interfaces";

interface Variable {
    defaultValue: unknown
}

export class SharedVariablesManager {
    private _variables = new Map<string, unknown>();
    private variableObjects: Map<string, Variable>;

    constructor(private roomConnection: RoomConnection, private gameMap: GameMap) {
        // We initialize the list of variable object at room start. The objects cannot be edited later
        // (otherwise, this would cause a security issue if the scripting API can edit this list of objects)
        this.variableObjects = SharedVariablesManager.findVariablesInMap(gameMap);

        // Let's initialize default values
        for (const [name, variableObject] of this.variableObjects.entries()) {
            this._variables.set(name, variableObject.defaultValue);
        }

        // When a variable is modified from an iFrame
        iframeListener.registerAnswerer('setVariable', (event) => {
            const key = event.key;

            if (!this.variableObjects.has(key)) {
                const errMsg = 'A script is trying to modify variable "'+key+'" but this variable is not defined in the map.' +
                    'There should be an object in the map whose name is "'+key+'" and whose type is "variable"';
                console.error(errMsg);
                throw new Error(errMsg);
            }

            this._variables.set(key, event.value);
            // TODO: dispatch to the room connection.
        });
    }

    private static findVariablesInMap(gameMap: GameMap): Map<string, Variable> {
        const objects = new Map<string, Variable>();
        for (const layer of gameMap.getMap().layers) {
            if (layer.type === 'objectgroup') {
                for (const object of layer.objects) {
                    if (object.type === 'variable') {
                        if (object.template) {
                            console.warn('Warning, a variable object is using a Tiled "template". WorkAdventure does not support objects generated from Tiled templates.')
                        }

                        // We store a copy of the object (to make it immutable)
                        objects.set(object.name, this.iTiledObjectToVariable(object));
                    }
                }
            }
        }
        return objects;
    }

    private static iTiledObjectToVariable(object: ITiledMapObject): Variable {
        const variable: Variable = {
            defaultValue: undefined
        };

        if (object.properties) {
            for (const property of object.properties) {
                if (property.name === 'default') {
                    variable.defaultValue = property.value;
                }
            }
        }

        return variable;
    }

    public close(): void {
        iframeListener.unregisterAnswerer('setVariable');
    }

    get variables(): Map<string, unknown> {
        return this._variables;
    }
}
