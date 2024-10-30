import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import type { ChangeAreaEvent } from "../Events/ChangeAreaEvent";
import type { CreateDynamicAreaEvent } from "../Events/CreateDynamicAreaEvent";
import { Area } from "./Area/Area";
import { IframeApiContribution, queryWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";

const enterAreaStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();
const leaveAreaStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();

export class WorkadventureAreaCommands extends IframeApiContribution<WorkadventureAreaCommands> {
    callbacks = [
        apiCallback({
            type: "enterAreaEvent",
            callback: (payloadData: ChangeAreaEvent) => {
                enterAreaStreams.get(payloadData.name)?.next();
            },
        }),
        apiCallback({
            type: "leaveAreaEvent",
            callback: (payloadData) => {
                leaveAreaStreams.get(payloadData.name)?.next();
            },
        }),
    ];

    /**
     * Create a new Area object (currently limited to rectangular shapes).
     * {@link https://docs.workadventu.re/map-building/api-room.md#create-area | Website documentation}
     *
     * @param {{name: string, x: number, y: number, width: number, height: number}} createAreaEvent Define the name, position and size of the area
     * @returns {Area} Area object
     */
    create(createAreaEvent: CreateDynamicAreaEvent): Area {
        void queryWorkadventure({
            type: "createArea",
            data: createAreaEvent,
        });
        return new Area(createAreaEvent);
    }

    /**
     * Get an existing Area object.
     * {@link https://docs.workadventu.re/map-building/api-room.md#get-an-area | Website documentation}
     *
     * @param {string} name Name of the area searched
     * @returns {Area} Area found
     */
    async get(name: string): Promise<Area> {
        const areaEvent = await queryWorkadventure({
            type: "getArea",
            data: name,
        });

        return new Area(areaEvent);
    }

    /**
     * Delete Area by its name.
     * {@link https://docs.workadventu.re/map-building/api-room.md#delete-area | Website documentation}
     *
     * @param {string} name Area name
     * @returns {Promise<void>} Promise resolved when the removing is finished
     */
    async delete(name: string): Promise<void> {
        await queryWorkadventure({
            type: "deleteArea",
            data: name,
        });
        enterAreaStreams.delete(name);
        leaveAreaStreams.delete(name);
    }

    /**
     * Listens to the position of the current user. The event is triggered when the user enters a given area.
     * {@link https://docs.workadventu.re/map-building/api-room.md#detecting-when-the-user-entersleaves-an-area | Website documentation}
     *
     * @param {string} areaName Area name
     * @returns {Subject<void>} An observable fired when someone enters the area
     */
    onEnter(areaName: string): Observable<void> {
        let subject = enterAreaStreams.get(areaName);
        if (subject === undefined) {
            subject = new Subject<void>();
            enterAreaStreams.set(areaName, subject);
        }

        return subject.asObservable();
    }

    /**
     * Listens to the position of the current user. The event is triggered when the user leaves a given area.
     * {@link https://docs.workadventu.re/map-building/api-room.md#detecting-when-the-user-entersleaves-an-area | Website documentation}
     *
     * @param {string} areaName Area name
     * @returns {Subject<void>} An observable fired when someone leaves the area
     */
    onLeave(areaName: string): Observable<void> {
        let subject = leaveAreaStreams.get(areaName);
        if (subject === undefined) {
            subject = new Subject<void>();
            leaveAreaStreams.set(areaName, subject);
        }

        return subject.asObservable();
    }
}

export default new WorkadventureAreaCommands();
