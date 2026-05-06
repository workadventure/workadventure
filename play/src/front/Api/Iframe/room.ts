import type { Observable, Subscription } from "rxjs";
import { Subject } from "rxjs";

import type { ITiledMap } from "@workadventure/tiled-map-type-guard";
import type { EnterLeaveEvent } from "../Events/EnterLeaveEvent";

import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

import type { WorkadventureRoomWebsiteCommands } from "./website";
import website from "./website";
import area from "./area";
import type { WorkadventureAreaCommands } from "./area";
import { getEnterLeaveObservable } from "./enterLeaveUtils";

const enterStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();
const leaveStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();

export interface TileDescriptor {
    x: number;
    y: number;
    tile: number | string | null;
    layer: string;
}

let roomId: string | undefined;

export const setRoomId = (id: string) => {
    roomId = id;
};

let hashParameters: Record<string, string> | undefined;

export const setHashParameters = (theHashParameters: Record<string, string>) => {
    hashParameters = theHashParameters;
};

let mapURL: string | undefined;

export const setMapURL = (url: string) => {
    mapURL = url;
};

export class WorkadventureRoomCommands extends IframeApiContribution<WorkadventureRoomCommands> {
    callbacks = [
        apiCallback({
            callback: (payloadData: EnterLeaveEvent) => {
                enterStreams.get(payloadData.name)?.next();
            },
            type: "enterEvent",
        }),
        apiCallback({
            type: "leaveEvent",
            callback: (payloadData) => {
                leaveStreams.get(payloadData.name)?.next();
            },
        }),
    ];

    /**
     * @deprecated Use onEnterLayer instead
     */
    onEnterZone(name: string, callback: () => void): Subscription {
        let subject = enterStreams.get(name);
        if (subject === undefined) {
            subject = new Subject<EnterLeaveEvent>();
            enterStreams.set(name, subject);
        }
        return subject.subscribe(callback);
    }

    /**
     * @deprecated Use onLeaveLayer instead
     */
    onLeaveZone(name: string, callback: () => void): Subscription {
        let subject = leaveStreams.get(name);
        if (subject === undefined) {
            subject = new Subject<EnterLeaveEvent>();
            leaveStreams.set(name, subject);
        }
        return subject.subscribe(callback);
    }

    /**
     * Listens to the position of the current user. The event is triggered when the user enters a given layer.
     * {@link https://docs.workadventu.re/map-building/api-room.md#detecting-when-the-user-entersleaves-a-layer | Website documentation}
     *
     * @param {string} layerName Name of the layer who as defined in Tiled
     * @returns {Observable<{ reason: "initial" | "move" }>} RxJS observable triggered when someone enters the layer
     */
    onEnterLayer(layerName: string): Observable<{ reason: "initial" | "move" }> {
        return getEnterLeaveObservable("layer", "enter", layerName);
    }

    /**
     * Listens to the position of the current user. The event is triggered when the user leaves a given layer.
     * {@link https://docs.workadventu.re/map-building/api-room.md#detecting-when-the-user-entersleaves-a-layer | Website documentation}
     *
     * @param {string} layerName Name of the layer who as defined in Tiled
     * @returns {Observable<{ reason: "initial" | "move" }>} RxJS observable triggered when someone leaves the layer
     */
    onLeaveLayer(layerName: string): Observable<{ reason: "initial" | "move" }> {
        return getEnterLeaveObservable("layer", "leave", layerName);
    }

    /**
     * This methods can be used to show a layer. if layerName is the name of a group layer, show all the layer in that group layer.
     * {@link https://docs.workadventu.re/map-building/api-room.md#show--hide-a-layer | Website documentation}
     *
     * @param {string} layerName Name of the layer/group layer who as defined in Tiled
     */
    showLayer(layerName: string): void {
        sendToWorkadventure({ type: "showLayer", data: { name: layerName } });
    }

    /**
     * This methods can be used to hide a layer. if layerName is the name of a group layer, hide all the layer in that group layer.
     * {@link https://docs.workadventu.re/map-building/api-room.md#show--hide-a-layer | Website documentation}
     *
     * @param {string} layerName Name of the layer/group layer who as defined in Tiled
     */
    hideLayer(layerName: string): void {
        sendToWorkadventure({ type: "hideLayer", data: { name: layerName } });
    }

    /**
     * Set the value of the propertyName property of the layer layerName at propertyValue.
     * If the property doesn't exist, create the property propertyName and set the value of the property at propertyValue.
     * Note : To unset a property from a layer, use setProperty with propertyValue set to undefined.
     * {@link https://docs.workadventu.re/map-building/api-room.md#setcreate-properties-in-a-layer | Website documentation}
     *
     * @param {string} layerName Name of the layer who as defined in Tiled
     * @param {string} propertyName Name of the property
     * @param {string|number|boolean|undefined} propertyValue Value of the property
     */
    setProperty(layerName: string, propertyName: string, propertyValue: string | number | boolean | undefined): void {
        sendToWorkadventure({
            type: "setProperty",
            data: {
                layerName: layerName,
                propertyName: propertyName,
                propertyValue: propertyValue,
            },
        });
    }

    /**
     * Returns a promise that resolves to the JSON map file.
     * Check the {@link https://doc.mapeditor.org/en/stable/reference/json-map-format/ | Tiled documentation to learn more about the format of the JSON map}.
     * {@link https://docs.workadventu.re/map-building/api-room.md#getting-map-data | Website documentation}
     *
     * @returns {Promise<ITiledMap>} Map in Tiled JSON format
     */
    async getTiledMap(): Promise<ITiledMap> {
        const event = await queryWorkadventure({ type: "getMapData", data: undefined });
        return event.data as ITiledMap;
    }

    /**
     * Replace the tile at the x and y coordinates in the layer named layer by the tile with the id tile.
     * {@link https://docs.workadventu.re/map-building/api-room.md#changing-tiles | Website documentation}
     *
     * @param {TileDescriptor[]} tiles Description of a tile
     */
    setTiles(tiles: TileDescriptor[]): void {
        sendToWorkadventure({
            type: "setTiles",
            data: tiles,
        });
    }

    /**
     * The ID of the current room is available from the WA.room.id property.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-room.md#get-the-room-id | Website documentation}
     *
     * @returns {string} Id of the room
     */
    get id(): string {
        if (roomId === undefined) {
            throw new Error("Room id not initialized yet. You should call WA.room.id within a WA.onInit callback.");
        }
        return roomId;
    }

    /**
     * The URL of the map is available from the WA.room.mapURL property.
     * Important: You need to wait for the end of the initialization before accessing.
     * {@link https://docs.workadventu.re/map-building/api-room.md#get-the-map-url | Website documentation}
     *
     * @returns {string} Url of the map
     */
    get mapURL(): string {
        if (mapURL === undefined) {
            throw new Error(
                "mapURL is not initialized yet. You should call WA.room.mapURL within a WA.onInit callback."
            );
        }
        return mapURL;
    }

    /**
     * The parameters behind the hash (#) of the URL are available from the WA.room.hashParameters property.
     * They should follow the format key=value&key2=value2.
     */
    get hashParameters(): Record<string, string> {
        if (hashParameters === undefined) {
            throw new Error(
                "hashParameters is not initialized yet. You should call WA.room.hashParameters within a WA.onInit callback."
            );
        }
        return hashParameters;
    }

    /**
     * Load a tileset in JSON format from a url and return the id of the first tile of the loaded tileset.
     * {@link https://docs.workadventu.re/map-building/api-room.md#loading-a-tileset | Website documentation}
     *
     * @param {string} url Url of the tileset
     * @returns {Promise<number>} Promise to return the id of the tileset
     */
    async loadTileset(url: string): Promise<number> {
        return await queryWorkadventure({
            type: "loadTileset",
            data: {
                url: url,
            },
        });
    }

    get website(): WorkadventureRoomWebsiteCommands {
        return website;
    }

    get area(): WorkadventureAreaCommands {
        return area;
    }
}

export default new WorkadventureRoomCommands();
