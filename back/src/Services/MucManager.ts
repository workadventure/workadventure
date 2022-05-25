import {ITiledMap, ITiledMapLayer, ITiledMapObject} from "@workadventure/tiled-map-type-guard/dist";
import Axios, {AxiosInstance} from "axios";

interface ChatZone {
    chatName?: string;
}

export class MucManager {

    /**
     * The list of the chat zone for the current room
     */
    private chatZones: Map<string, ChatZone> | undefined;

    private axios: AxiosInstance | undefined;

    /**
     * @param roomUrl
     * @param map The map can be "null" if it is hosted on a private network. In this case, we assume this is a test setup and bypass any server-side checks.
     */
    constructor(private roomUrl: string, private map: ITiledMap | null) {
        // We initialize the list of variable object at room start. The objects cannot be edited later
        // (otherwise, this would cause a security issue if the scripting API can edit this list of objects)
        if (map) {
            this.chatZones = MucManager.findChatZonesInMap(map);

            console.log(this.chatZones);

            /*
            this.axios = Axios.create({
                baseURL: process.env.EJABBERD_URI+'/api/',
                headers: {
                    auth: [
                        process.env.EJABBERD_USER, process.env.EJABBERD_PASSWORD
                    ]
                }
            });
             */

            // Let's initialize default values
            /*for (const [name, variableObject] of this.variableObjects.entries()) {
                if (variableObject.defaultValue !== undefined) {
                    this._variables.set(name, variableObject.defaultValue);
                }
            }*/
        }
    }

    private static findChatZonesInMap(map: ITiledMap): Map<string, ChatZone> {
        const objects = new Map<string, ChatZone>();
        for (const layer of map.layers) {
            this.recursiveFindChatZonesInLayer(layer, objects);
        }
        return objects;
    }

    private static recursiveFindChatZonesInLayer(layer: ITiledMapLayer, objects: Map<string, ChatZone>): void {
        if (layer.type === "objectgroup") {
            for (const object of layer.objects) {
                if (object.type === "area") {
                    if (object.template) {
                        console.warn(
                            'Warning, a variable object is using a Tiled "template". WorkAdventure does not support objects generated from Tiled templates.'
                        );
                        continue;
                    }

                    // We store a copy of the object (to make it immutable)
                    const chatZone = this.iTiledObjectToChatZone(object);
                    objects.set(chatZone.chatName as string, chatZone);
                }
            }
        } else if (layer.type === "group") {
            for (const innerLayer of layer.layers as ITiledMapLayer[]) {
                this.recursiveFindChatZonesInLayer(innerLayer, objects);
            }
        }
    }

    private static iTiledObjectToChatZone(object: ITiledMapObject): ChatZone {
        const variable: ChatZone = {};

        if (object.properties) {
            for (const property of object.properties) {
                const value = property.value as unknown;
                switch (property.name) {
                    case "chatName":
                        if (typeof value !== "string") {
                            throw new Error('The persist property of variable "' + object.name + '" must be a string');
                        }
                        variable.chatName = value;
                        break;
                }
            }
        }

        return variable;
    }


}
