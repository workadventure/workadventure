import { ITiledMap, ITiledMapLayer, ITiledMapObject } from "@workadventure/tiled-map-type-guard/dist";
import Axios from "axios";
import { EjabberdClient, ejabberdClient } from "./EjabberdClient";
import { MapDetailsData } from "../Messages/JsonMessages/MapDetailsData";

export interface MucRoom {
    chatName?: string;
    mucUrl?: string;
    mucCreated?: boolean;
    type?: string;
}

export class MucManager {
    /**
     * The list of the chat zone for the current room
     */
    private mucRooms: Map<string, MucRoom> | undefined;

    /**
     * @param roomUrl
     * @param map The map can be "null" if it is hosted on a private network. In this case, we assume this is a test setup and bypass any server-side checks.
     * @param mapDetails
     */
    constructor(private roomUrl: string, private map: ITiledMap | null, private mapDetails: MapDetailsData) {
        // We initialize the list of variable object at room start. The objects cannot be edited later
        // (otherwise, this would cause a security issue if the scripting API can edit this list of objects)
        if (map) {
            this.mucRooms = MucManager.findMucRoomsInMap(map);
            this.mucRooms?.forEach((mucRoom) => {
                if (mucRoom.type === "forum") {
                    mucRoom.mucUrl = `${this.roomUrl}/forum/${mucRoom?.chatName ?? ""}`;
                } else {
                    mucRoom.mucUrl = `${this.roomUrl}/${mucRoom?.chatName ?? ""}`;
                }
                mucRoom.mucCreated = false;
            });
            // LATER : If we want to let the default forum name to be customisable in a map property ...
            // if (mapDetails.mucRooms !== null) {
            //     // If the ADMIN exist we disable all the forums from the MAP
            //     this.mucRooms.forEach((chat) => {
            //         if (chat.type === "forum") {
            //             chat.mucCreated = true;
            //         }
            //     });
            // } else {
            //     console.log("No admin set");
            //     // If the ADMIN_URL is not set, so there is no admin, and we define a default chatForum MUC room if it's not defined in the map
            //     if (this.getDefaultForum() === null) {
            //         this.mucRooms.set("welcome", {
            //             chatName: "welcome",
            //             mucUrl: `${this.roomUrl}/forum/welcome`,
            //             mucCreated: false,
            //             type: "forum",
            //         } as MucRoom);
            //     }
            // }
        }
    }

    public async init() {
        const allMucRoomsCreated = await ejabberdClient.getAllMucRooms();
        const allMucRoomsCreatedOfWorld: string[] = [];
        if (Axios.isAxiosError(allMucRoomsCreated)) {
            console.warn("Error to get allMucRooms (AxiosError) : ", allMucRoomsCreated.response);
        } else if (allMucRoomsCreated instanceof Error) {
            console.warn("Error to get allMucRooms : ", allMucRoomsCreated);
        } else {
            if (allMucRoomsCreated) {
                allMucRoomsCreated.forEach((mucRoom) => {
                    const [local] = mucRoom.split("@");
                    const decoded = EjabberdClient.decode(local);
                    if (decoded?.includes(this.roomUrl)) {
                        allMucRoomsCreatedOfWorld.push(decoded);
                    }
                });
            }
            if (allMucRoomsCreatedOfWorld) {
                for (const mucRoomCreated of allMucRoomsCreatedOfWorld) {
                    let found = false;
                    this.mucRooms?.forEach((mucRoom) => {
                        if (found) return;
                        if (mucRoom.mucUrl) {
                            if (mucRoomCreated.toLocaleLowerCase() === mucRoom.mucUrl.toLocaleLowerCase()) {
                                found = true;
                                mucRoom.mucCreated = true;
                            }
                        }
                    });
                    if (!found) {
                        await ejabberdClient.destroyMucRoom(mucRoomCreated);
                    }
                }
            }
            if (this.mucRooms) {
                for (const [, mucRoom] of this.mucRooms) {
                    if (mucRoom.mucCreated) return;
                    if (mucRoom.mucUrl) {
                        await ejabberdClient.createMucRoom(mucRoom);
                        mucRoom.mucCreated = true;
                    }
                }
            }
        }
    }

    public getDefaultForum(): MucRoom | null {
        let defaultForum = null;
        this.mucRooms?.forEach((mucRoom) => {
            if (mucRoom.type === "forum") {
                defaultForum = mucRoom;
            }
        });
        return defaultForum;
    }

    private static findMucRoomsInMap(map: ITiledMap): Map<string, MucRoom> {
        const objects = new Map<string, MucRoom>();
        for (const layer of map.layers) {
            this.recursiveFindMucRoomsInLayer(layer, objects);
        }
        return objects;
    }

    private static recursiveFindMucRoomsInLayer(layer: ITiledMapLayer, objects: Map<string, MucRoom>): void {
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
                    const mucRoom = this.iTiledObjectToMucRoom(object);
                    objects.set(mucRoom.chatName as string, mucRoom);
                }
            }
        } else if (layer.type === "group") {
            for (const innerLayer of layer.layers) {
                this.recursiveFindMucRoomsInLayer(innerLayer, objects);
            }
        }
    }

    private static iTiledObjectToMucRoom(object: ITiledMapObject): MucRoom {
        const variable: MucRoom = {};

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
