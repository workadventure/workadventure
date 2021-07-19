/**
 * Handles variables shared between the scripting API and the server.
 */
import {ITiledMap, ITiledMapObject, ITiledMapObjectLayer} from "@workadventure/tiled-map-type-guard/dist";
import {User} from "_Model/User";

interface Variable {
    defaultValue?: string,
    persist?: boolean,
    readableBy?: string,
    writableBy?: string,
}

export class VariablesManager {
    /**
     * The actual values of the variables for the current room
     */
    private _variables = new Map<string, string>();

    /**
     * The list of variables that are allowed
     */
    private variableObjects: Map<string, Variable> | undefined;

    /**
     * @param map The map can be "null" if it is hosted on a private network. In this case, we assume this is a test setup and bypass any server-side checks.
     */
    constructor(private map: ITiledMap | null) {
        // We initialize the list of variable object at room start. The objects cannot be edited later
        // (otherwise, this would cause a security issue if the scripting API can edit this list of objects)
        if (map) {
            this.variableObjects = VariablesManager.findVariablesInMap(map);

            // Let's initialize default values
            for (const [name, variableObject] of this.variableObjects.entries()) {
                if (variableObject.defaultValue !== undefined) {
                    this._variables.set(name, variableObject.defaultValue);
                }
            }
        }
    }

    private static findVariablesInMap(map: ITiledMap): Map<string, Variable> {
        const objects = new Map<string, Variable>();
        for (const layer of map.layers) {
            if (layer.type === 'objectgroup') {
                for (const object of (layer as ITiledMapObjectLayer).objects) {
                    if (object.type === 'variable') {
                        if (object.template) {
                            console.warn('Warning, a variable object is using a Tiled "template". WorkAdventure does not support objects generated from Tiled templates.')
                            continue;
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
        const variable: Variable = {};

        if (object.properties) {
            for (const property of object.properties) {
                const value = property.value;
                switch (property.name) {
                    case 'default':
                        variable.defaultValue = JSON.stringify(value);
                        break;
                    case 'persist':
                        if (typeof value !== 'boolean') {
                            throw new Error('The persist property of variable "' + object.name + '" must be a boolean');
                        }
                        variable.persist = value;
                        break;
                    case 'writableBy':
                        if (typeof value !== 'string') {
                            throw new Error('The writableBy property of variable "' + object.name + '" must be a string');
                        }
                        if (value) {
                            variable.writableBy = value;
                        }
                        break;
                    case 'readableBy':
                        if (typeof value !== 'string') {
                            throw new Error('The readableBy property of variable "' + object.name + '" must be a string');
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

    setVariable(name: string, value: string, user: User): string | undefined {
        let readableBy: string | undefined;
        if (this.variableObjects) {
            const variableObject = this.variableObjects.get(name);
            if (variableObject === undefined) {
                throw new Error('Trying to set a variable "' + name + '" that is not defined as an object in the map.');
            }

            if (variableObject.writableBy && user.tags.indexOf(variableObject.writableBy) === -1) {
                throw new Error('Trying to set a variable "' + name + '". User "' + user.name + '" does not have sufficient permission. Required tag: "' + variableObject.writableBy + '". User tags: ' + user.tags.join(', ') + ".");
            }

            readableBy = variableObject.readableBy;
        }

        this._variables.set(name, value);
        return readableBy;
    }

    public getVariablesForTags(tags: string[]): Map<string, string> {
        if (this.variableObjects === undefined) {
            return this._variables;
        }

        const readableVariables = new Map<string, string>();

        for (const [key, value] of this._variables.entries()) {
            const variableObject = this.variableObjects.get(key);
            if (variableObject === undefined) {
                throw new Error('Unexpected variable "'+key+'" found has no associated variableObject.');
            }
            if (!variableObject.readableBy || tags.indexOf(variableObject.readableBy) !== -1) {
                readableVariables.set(key, value);
            }
        }
        return readableVariables;
    }
}
