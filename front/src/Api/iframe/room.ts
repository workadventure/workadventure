import { Subject } from "rxjs";

import { EnterLeaveEvent, isEnterLeaveEvent } from "../Events/EnterLeaveEvent";
import { ChangeLayerEvent, isChangeLayerEvent } from "../Events/ChangeLayerEvent";

import { IframeApiContribution, queryWorkadventure, sendToWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

import type { ITiledMap } from "../../Phaser/Map/ITiledMap";
import type { WorkadventureRoomWebsiteCommands } from "./website";
import website from "./website";

const enterStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();
const leaveStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();

const enterLayerStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();
const leaveLayerStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();

interface TileDescriptor {
    x: number;
    y: number;
    tile: number | string | null;
    layer: string;
}

let roomId: string | undefined;

export const setRoomId = (id: string) => {
    roomId = id;
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
            typeChecker: isEnterLeaveEvent,
        }),
        apiCallback({
            type: "leaveEvent",
            typeChecker: isEnterLeaveEvent,
            callback: (payloadData) => {
                leaveStreams.get(payloadData.name)?.next();
            },
        }),
        apiCallback({
            type: "enterLayerEvent",
            typeChecker: isChangeLayerEvent,
            callback: (payloadData: ChangeLayerEvent) => {
                enterLayerStreams.get(payloadData.name)?.next();
            },
        }),
        apiCallback({
            type: "leaveLayerEvent",
            typeChecker: isChangeLayerEvent,
            callback: (payloadData) => {
                leaveLayerStreams.get(payloadData.name)?.next();
            },
        }),
    ];

    /**
     * @deprecated Use onEnterLayer instead
     */
    onEnterZone(name: string, callback: () => void): void {
        let subject = enterStreams.get(name);
        if (subject === undefined) {
            subject = new Subject<EnterLeaveEvent>();
            enterStreams.set(name, subject);
        }
        subject.subscribe(callback);
    }

    /**
     * @deprecated Use onLeaveLayer instead
     */
    onLeaveZone(name: string, callback: () => void): void {
        let subject = leaveStreams.get(name);
        if (subject === undefined) {
            subject = new Subject<EnterLeaveEvent>();
            leaveStreams.set(name, subject);
        }
        subject.subscribe(callback);
    }

    onEnterLayer(layerName: string): Subject<void> {
        let subject = enterLayerStreams.get(layerName);
        if (subject === undefined) {
            subject = new Subject<void>();
            enterLayerStreams.set(layerName, subject);
        }

        return subject;
    }

    onLeaveLayer(layerName: string): Subject<void> {
        let subject = leaveLayerStreams.get(layerName);
        if (subject === undefined) {
            subject = new Subject<void>();
            leaveLayerStreams.set(layerName, subject);
        }

        return subject;
    }

    showLayer(layerName: string): void {
        sendToWorkadventure({ type: "showLayer", data: { name: layerName } });
    }

    hideLayer(layerName: string): void {
        sendToWorkadventure({ type: "hideLayer", data: { name: layerName } });
    }

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

    async getTiledMap(): Promise<ITiledMap> {
        const event = await queryWorkadventure({ type: "getMapData", data: undefined });
        return event.data as ITiledMap;
    }

    setTiles(tiles: TileDescriptor[]) {
        sendToWorkadventure({
            type: "setTiles",
            data: tiles,
        });
    }

    get id(): string {
        if (roomId === undefined) {
            throw new Error("Room id not initialized yet. You should call WA.room.id within a WA.onInit callback.");
        }
        return roomId;
    }

    get mapURL(): string {
        if (mapURL === undefined) {
            throw new Error(
                "mapURL is not initialized yet. You should call WA.room.mapURL within a WA.onInit callback."
            );
        }
        return mapURL;
    }

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
}

export default new WorkadventureRoomCommands();
