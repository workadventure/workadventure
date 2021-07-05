import {Observable, Subject} from "rxjs";

import { isMapDataEvent } from "../Events/MapDataEvent";
import { EnterLeaveEvent, isEnterLeaveEvent } from "../Events/EnterLeaveEvent";
import { isGameStateEvent } from "../Events/GameStateEvent";

import {IframeApiContribution, queryWorkadventure, sendToWorkadventure} from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import type {LayerEvent} from "../Events/LayerEvent";
import type {SetPropertyEvent} from "../Events/setPropertyEvent";
import {isSetVariableEvent, SetVariableEvent} from "../Events/SetVariableEvent";

import type { ITiledMap } from "../../Phaser/Map/ITiledMap";
import type { MapDataEvent } from "../Events/MapDataEvent";
import type { GameStateEvent } from "../Events/GameStateEvent";

const enterStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();
const leaveStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();
const setVariableResolvers = new Subject<SetVariableEvent>();
const variables = new Map<string, unknown>();
const variableSubscribers = new Map<string, Subject<unknown>>();

interface TileDescriptor {
    x: number;
    y: number;
    tile: number | string;
    layer: string;
}

let roomId: string|undefined;

export const setRoomId = (id: string) => {
    roomId = id;
}

let mapURL: string|undefined;

export const setMapURL = (url: string) => {
    mapURL = url;
}

setVariableResolvers.subscribe((event) => {
    variables.set(event.key, event.value);
    const subject = variableSubscribers.get(event.key);
    if (subject !== undefined) {
        subject.next(event.value);
    }
});

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
            type: "setVariable",
            typeChecker: isSetVariableEvent,
            callback: (payloadData) => {
                setVariableResolvers.next(payloadData);
            }
        }),
    ];

    onEnterZone(name: string, callback: () => void): void {
        let subject = enterStreams.get(name);
        if (subject === undefined) {
            subject = new Subject<EnterLeaveEvent>();
            enterStreams.set(name, subject);
        }
        subject.subscribe(callback);
    }
    onLeaveZone(name: string, callback: () => void): void {
        let subject = leaveStreams.get(name);
        if (subject === undefined) {
            subject = new Subject<EnterLeaveEvent>();
            leaveStreams.set(name, subject);
        }
        subject.subscribe(callback);
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
    async getMap(): Promise<ITiledMap> {
        const event = await queryWorkadventure({ type: "getMapData", data: undefined });
        return event.data as ITiledMap;
    }
    setTiles(tiles: TileDescriptor[]) {
        sendToWorkadventure({
            type: "setTiles",
            data: tiles,
        });
    }

    saveVariable(key : string, value : unknown): void {
        variables.set(key, value);
        sendToWorkadventure({
            type: 'setVariable',
            data: {
                key,
                value
            }
        })
    }

    loadVariable(key: string): unknown {
        return variables.get(key);
    }

    onVariableChange(key: string): Observable<unknown> {
        let subject = variableSubscribers.get(key);
        if (subject === undefined) {
            subject = new Subject<unknown>();
            variableSubscribers.set(key, subject);
        }
        return subject.asObservable();
    }


    get id() : string {
        if (roomId === undefined) {
            throw new Error('Room id not initialized yet. You should call WA.room.id within a WA.onInit callback.');
        }
        return roomId;
    }

    get mapURL() : string {
        if (mapURL === undefined) {
            throw new Error('mapURL is not initialized yet. You should call WA.room.mapURL within a WA.onInit callback.');
        }
        return mapURL;
    }
}

export default new WorkadventureRoomCommands();
