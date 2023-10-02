import { ITiledMap, ITiledMapLayer, ITiledMapObject } from "@workadventure/tiled-map-type-guard/dist";
import { isAxiosError } from "axios";
import { MapDetailsData } from "@workadventure/messages";
import { EjabberdClient, ejabberdClient } from "./EjabberdClient";

export interface ChatZone {
    chatName?: string;
    mucUrl?: string;
    mucCreated?: boolean;
}

export class MucManager {
    /**
     * The list of the chat zone for the current room
     */
    private chatZones: Map<string, ChatZone> | undefined;

    /**
     * @param roomUrl
     * @param map The map can be "null" if it is hosted on a private network. In this case, we assume this is a test setup and bypass any server-side checks.
     */
    constructor(private roomUrl: string, private map: ITiledMap | null) {
        // We initialize the list of variable object at room start. The objects cannot be edited later
        // (otherwise, this would cause a security issue if the scripting API can edit this list of objects)
        if (map) {
            this.chatZones = MucManager.findChatZonesInMap(map);
            this.chatZones?.forEach((chatZone) => {
                chatZone.mucUrl = `${this.roomUrl}/${chatZone?.chatName ?? ""}`;
                chatZone.mucCreated = false;
            });
        }
    }

    public async init(mapDetails: MapDetailsData) {
        const allMucRooms = await ejabberdClient.getAllMucRooms();
        const allMucRoomsOfWorld: string[] = [];
        if (isAxiosError(allMucRooms)) {
            console.warn("Error to get allMucRooms (AxiosError) : ", allMucRooms.message, allMucRooms);
        } else if (allMucRooms instanceof Error) {
            console.warn("Error to get allMucRooms : ", allMucRooms);
        } else {
            if (allMucRooms) {
                allMucRooms.forEach((mucRoom) => {
                    const [local] = mucRoom.split("@");
                    const decoded = EjabberdClient.decode(local);
                    if (decoded?.includes(this.roomUrl)) {
                        allMucRoomsOfWorld.push(decoded);
                    }
                });
            }
            const promises: Promise<void>[] = [];
            if (allMucRoomsOfWorld) {
                for (const mucRoom of allMucRoomsOfWorld) {
                    let found = false;
                    this.chatZones?.forEach((chatZone) => {
                        if (found) return;
                        if (chatZone.mucUrl) {
                            if (mucRoom.toLocaleLowerCase() === chatZone.mucUrl.toLocaleLowerCase()) {
                                found = true;
                                chatZone.mucCreated = true;
                            }
                        }
                    });
                    if (!found) {
                        promises.push(ejabberdClient.destroyMucRoom(mucRoom));
                    }
                }
            }
            if (this.chatZones && mapDetails.enableChat) {
                for (const [, chatZone] of this.chatZones) {
                    if (chatZone.mucCreated) return;
                    if (chatZone.mucUrl) {
                        promises.push(ejabberdClient.createMucRoom(chatZone));
                        chatZone.mucCreated = true;
                    }
                }
            }
            await Promise.all(promises);
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
            for (const innerLayer of layer.layers) {
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
