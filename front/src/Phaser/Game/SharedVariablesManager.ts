/**
 * Handles variables shared between the scripting API and the server.
 */
import type {RoomConnection} from "../../Connexion/RoomConnection";
import {iframeListener} from "../../Api/IframeListener";
import type {Subscription} from "rxjs";
import type {GameMap} from "./GameMap";
import type {ITiledMapObject} from "../Map/ITiledMap";

export class SharedVariablesManager {
    private _variables = new Map<string, unknown>();
    private iframeListenerSubscription: Subscription;
    private variableObjects: Map<string, ITiledMapObject>;

    constructor(private roomConnection: RoomConnection, private gameMap: GameMap) {
        // We initialize the list of variable object at room start. The objects cannot be edited later
        // (otherwise, this would cause a security issue if the scripting API can edit this list of objects)
        this.variableObjects = SharedVariablesManager.findVariablesInMap(gameMap);

        // When a variable is modified from an iFrame
        this.iframeListenerSubscription = iframeListener.setVariableStream.subscribe((event) => {
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

    private static findVariablesInMap(gameMap: GameMap): Map<string, ITiledMapObject> {
        const objects = new Map<string, ITiledMapObject>();
        for (const layer of gameMap.getMap().layers) {
            if (layer.type === 'objectgroup') {
                for (const object of layer.objects) {
                    if (object.type === 'variable') {
                        // We store a copy of the object (to make it immutable)
                        objects.set(object.name, {...object});
                    }
                }
            }
        }
        return objects;
    }


    public close(): void {
        this.iframeListenerSubscription.unsubscribe();
    }

    get variables(): Map<string, unknown> {
        return this._variables;
    }
}
