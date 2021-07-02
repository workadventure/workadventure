import {Observable, Subject} from "rxjs";

import { isDataLayerEvent } from "../Events/DataLayerEvent";
import { EnterLeaveEvent, isEnterLeaveEvent } from "../Events/EnterLeaveEvent";
import { isGameStateEvent } from "../Events/GameStateEvent";

import {IframeApiContribution, queryWorkadventure, sendToWorkadventure} from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import type {LayerEvent} from "../Events/LayerEvent";
import type {SetPropertyEvent} from "../Events/setPropertyEvent";
import {isSetVariableEvent, SetVariableEvent} from "../Events/SetVariableEvent";

import type { ITiledMap } from "../../Phaser/Map/ITiledMap";
import type { DataLayerEvent } from "../Events/DataLayerEvent";
import type { GameStateEvent } from "../Events/GameStateEvent";

const enterStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();
const leaveStreams: Map<string, Subject<EnterLeaveEvent>> = new Map<string, Subject<EnterLeaveEvent>>();
const dataLayerResolver = new Subject<DataLayerEvent>();
const stateResolvers = new Subject<GameStateEvent>();
const setVariableResolvers = new Subject<SetVariableEvent>();
const variables = new Map<string, unknown>();
const variableSubscribers = new Map<string, Subject<unknown>>();

let immutableDataPromise: Promise<GameStateEvent> | undefined = undefined;

interface Room {
    id: string;
    mapUrl: string;
    map: ITiledMap;
    startLayer: string | null;
}

interface User {
    id: string | undefined;
    nickName: string | null;
    tags: string[];
}

interface TileDescriptor {
    x: number;
    y: number;
    tile: number | string;
    layer: string;
}

function getGameState(): Promise<GameStateEvent> {
    if (immutableDataPromise === undefined) {
        immutableDataPromise = queryWorkadventure({ type: "getState", data: undefined });
    }
    return immutableDataPromise;
}

function getDataLayer(): Promise<DataLayerEvent> {
    return new Promise<DataLayerEvent>((resolver, thrower) => {
        dataLayerResolver.subscribe(resolver);
        sendToWorkadventure({ type: "getDataLayer", data: null });
    });
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
            type: "dataLayer",
            typeChecker: isDataLayerEvent,
            callback: (payloadData) => {
                dataLayerResolver.next(payloadData);
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
    getCurrentRoom(): Promise<Room> {
        return getGameState().then((gameState) => {
            return getDataLayer().then((mapJson) => {
                return {
                    id: gameState.roomId,
                    map: mapJson.data as ITiledMap,
                    mapUrl: gameState.mapUrl,
                    startLayer: gameState.startLayerName,
                };
            });
        });
    }
    getCurrentUser(): Promise<User> {
        return getGameState().then((gameState) => {
            return { id: gameState.uuid, nickName: gameState.nickname, tags: gameState.tags };
        });
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
}

export default new WorkadventureRoomCommands();
