import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import { WAMFileFormat } from "@workadventure/map-editor";
import type { ChangeAreaEvent } from "../Events/ChangeAreaEvent";
import { IframeApiContribution, queryWorkadventure } from "./IframeApiContribution";
import { apiCallback } from "./registeredCallbacks";
import { MapEditorArea, toMapEditorArea } from "./MapEditor/MapEditorArea";

const enterAreaStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();
const leaveAreaStreams: Map<string, Subject<void>> = new Map<string, Subject<void>>();

class WorkadventureMapEditorAreaCommands extends IframeApiContribution<WorkadventureMapEditorAreaCommands> {
    callbacks = [
        apiCallback({
            type: "enterMapEditorAreaEvent",
            callback: (payloadData: ChangeAreaEvent) => {
                enterAreaStreams.get(payloadData.name)?.next();
            },
        }),
        apiCallback({
            type: "leaveMapEditorAreaEvent",
            callback: (payloadData) => {
                leaveAreaStreams.get(payloadData.name)?.next();
            },
        }),
    ];

    /**
     * Listens to the position of the current user. The event is triggered when the user enters a given area.
     * {@link https://docs.workadventu.re/map-building/api-mapeditor.md#detecting-when-the-user-entersleaves-an-area | Website documentation}
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
     * {@link https://docs.workadventu.re/map-building/api-mapeditor.md#detecting-when-the-user-entersleaves-an-area | Website documentation}
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

    private wamMapCache: Promise<WAMFileFormat | undefined> | undefined;

    /**
     * Returns a promise that resolves to the WAM map file.
     * The WAM is cached in memory.
     *
     * @returns {Promise<WAMFileFormat>} Map in Tiled JSON format
     */
    private getWamMap(): Promise<WAMFileFormat | undefined> {
        if (this.wamMapCache) {
            return this.wamMapCache;
        }
        this.wamMapCache = queryWorkadventure({ type: "getWamMapData", data: undefined }).then((wamMap) => {
            return wamMap.data as WAMFileFormat | undefined;
        });
        return this.wamMapCache;
    }

    /**
     * Returns a list of areas defined in the map editor.
     *
     * @returns {Promise<MapEditorArea[]>} List of areas
     */
    public async list(): Promise<MapEditorArea[]> {
        const wamMap = await this.getWamMap();
        if (wamMap === undefined) {
            throw new Error("This is a public map. The map editor is not available on public maps.");
        }
        return wamMap.areas.map(toMapEditorArea);
    }
}

const area = new WorkadventureMapEditorAreaCommands();

export class WorkadventureMapEditorCommands extends IframeApiContribution<WorkadventureMapEditorCommands> {
    callbacks = [];

    get area(): WorkadventureMapEditorAreaCommands {
        return area;
    }
}

export default new WorkadventureMapEditorCommands();
