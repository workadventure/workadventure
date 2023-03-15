import { AreaData, AreaDataProperties, GameMapProperties, WAMFileFormat } from "../types";
import { AreaType } from "../types";
import * as _ from "lodash";
import { MathUtils } from "@workadventure/math-utils";

export type AreaChangeCallback = (
    areasChangedByAction: Array<AreaData>,
    allAreasOnNewPosition: Array<AreaData>
) => void;

export class GameMapAreas {
    private wam: WAMFileFormat;

    private enterAreaCallbacks = Array<AreaChangeCallback>();
    private leaveAreaCallbacks = Array<AreaChangeCallback>();

    /**
     * Areas created from within map-editor
     */
    private readonly staticAreas: Map<string, AreaData> = new Map<string, AreaData>();
    /**
     * Areas that we can do CRUD operations on via scripting API
     */
    private readonly dynamicAreas: Map<string, AreaData> = new Map<string, AreaData>();

    private readonly areasPositionOffsetY: number = 16;
    private readonly MAP_PROPERTY_AREAS_NAME: string = "areas";

    constructor(wam: WAMFileFormat) {
        this.wam = wam;

        for (const areaData of this.wam.areas) {
            this.addArea(areaData, AreaType.Static, false);
        }
    }

    private flattenAreaProperties(areaProperties: AreaDataProperties): Record<string, string | boolean | number> {
        const flattenedProperties: Record<string, string | boolean | number> = {};
        if (areaProperties.focusable) {
            flattenedProperties[GameMapProperties.FOCUSABLE] = true;
            if (areaProperties.focusable.zoom_margin) {
                flattenedProperties[GameMapProperties.ZOOM_MARGIN] = areaProperties.focusable.zoom_margin;
            }
        }
        if (areaProperties.jitsiRoom) {
            flattenedProperties[GameMapProperties.JITSI_ROOM] = areaProperties.jitsiRoom.roomName ?? "";
            if (areaProperties.jitsiRoom.jitsiRoomConfig) {
                flattenedProperties[GameMapProperties.JITSI_CONFIG] = JSON.stringify(
                    areaProperties.jitsiRoom.jitsiRoomConfig
                );
            }
        }
        if (areaProperties.openWebsite) {
            if (areaProperties.openWebsite.newTab) {
                flattenedProperties[GameMapProperties.OPEN_TAB] = areaProperties.openWebsite.link;
            } else {
                flattenedProperties[GameMapProperties.OPEN_WEBSITE] = areaProperties.openWebsite.link;
            }
        }
        if (areaProperties.playAudio) {
            flattenedProperties[GameMapProperties.PLAY_AUDIO] = areaProperties.playAudio.audioLink;
        }
        if (areaProperties.start) {
            flattenedProperties[GameMapProperties.START] = areaProperties.start;
        }
        if (areaProperties.silent) {
            flattenedProperties[GameMapProperties.SILENT] = areaProperties.silent;
        }
        return flattenedProperties;
    }

    /**
     * @returns If there were any areas changes
     */
    public triggerAreasChange(
        oldPosition: { x: number; y: number } | undefined,
        position: { x: number; y: number } | undefined
    ): boolean {
        const areasByOldPosition = oldPosition ? this.getAreasOnPosition(oldPosition, this.areasPositionOffsetY) : [];
        const areasByNewPosition = position ? this.getAreasOnPosition(position, this.areasPositionOffsetY) : [];

        const enterAreas = new Set(areasByNewPosition);
        const leaveAreas = new Set(areasByOldPosition);

        enterAreas.forEach((area) => {
            if (leaveAreas.has(area)) {
                leaveAreas.delete(area);
                enterAreas.delete(area);
            }
        });

        let areasChange = false;
        if (enterAreas.size > 0) {
            const areasArray = Array.from(enterAreas);

            for (const callback of this.enterAreaCallbacks) {
                callback(areasArray, areasByNewPosition);
            }
            areasChange = true;
        }

        if (leaveAreas.size > 0) {
            const areasArray = Array.from(leaveAreas);
            for (const callback of this.leaveAreaCallbacks) {
                callback(areasArray, areasByNewPosition);
            }
            areasChange = true;
        }
        return areasChange;
    }

    public addArea(
        area: AreaData,
        type: AreaType,
        addToWAM = true,
        playerPosition?: { x: number; y: number }
    ): boolean {
        if (this.getAreas(type).has(area.id)) {
            return false;
        }
        this.getAreas(type).set(area.id, area);

        if (playerPosition && this.isPlayerInsideAreaByName(area.name, type, playerPosition)) {
            this.triggerSpecificAreaOnEnter(area);
        }

        if (addToWAM) {
            return this.addAreaToWAM(area);
        }
        return true;
    }

    public isPlayerInsideArea(id: string, type: AreaType, playerPosition: { x: number; y: number }): boolean {
        return (
            this.getAreasOnPosition(playerPosition, this.areasPositionOffsetY, type).findIndex(
                (area) => area.id === id
            ) !== -1
        );
    }

    public isPlayerInsideAreaByName(name: string, type: AreaType, position: { x: number; y: number }): boolean {
        return (
            this.getAreasOnPosition(position, this.areasPositionOffsetY, type).findIndex(
                (area) => area.name === name
            ) !== -1
        );
    }
    public updateAreaByName(name: string, type: AreaType, config: Partial<AreaData>): AreaData | undefined {
        const area = this.getAreaByName(name, type);
        if (!area) {
            return;
        }
        this.updateArea(area, config);
        return area;
    }

    public updateAreaById(id: string, type: AreaType, config: Partial<AreaData>): AreaData | undefined {
        const area = this.getArea(id, type);
        if (!area) {
            return;
        }
        this.updateArea(area, config);
        return area;
    }

    public deleteAreaByName(name: string, type: AreaType, playerPosition?: { x: number; y: number }): void {
        if (playerPosition) {
            const area = this.getAreasOnPosition(playerPosition, this.areasPositionOffsetY, type).find(
                (area) => area.name === name
            );
            if (area) {
                this.triggerSpecificAreaOnLeave(area);
            }
        }
        const areas = Array.from(this.getAreas(type).values());
        const area = areas.find((area) => area.name === name);
        if (area) {
            const id = area.id;
            const deleted = this.getAreas(type).delete(id);
            if (deleted && type === AreaType.Static) {
                this.deleteStaticArea(id);
            }
        }
    }

    public deleteAreaById(id: string, type: AreaType, playerPosition?: { x: number; y: number }): boolean {
        if (playerPosition) {
            const area = this.getAreasOnPosition(playerPosition, this.areasPositionOffsetY, type).find(
                (area) => area.id === id
            );
            if (area) {
                this.triggerSpecificAreaOnLeave(area);
            }
        }
        if (type === AreaType.Static) {
            this.deleteStaticArea(id);
            return true;
        }
        return false;
    }

    private updateArea(area: AreaData, config: Partial<AreaData>): void {
        if (!area) {
            throw new Error(`Area to update does not exists!`);
        }
        _.merge(area, config);
        this.updateAreaWAM(area);
    }

    private addAreaToWAM(areaData: AreaData): boolean {
        if (!this.wam.areas.find((area) => area.id === areaData.id)) {
            this.wam.areas.push(areaData);
        } else {
            console.warn(`ADD AREA FAIL: AREA OF ID ${areaData.id} ALREADY EXISTS WITHIN THE WAM FILE!`);
            return false;
        }
        return true;
    }

    private deleteAreaFromWAM(id: string): boolean {
        const index = this.wam.areas.findIndex((area) => area.id === id);
        if (index !== -1) {
            this.wam.areas.splice(index, 1);
            return true;
        }
        return false;
    }

    private updateAreaWAM(areaData: AreaData): boolean {
        const index = this.wam.areas.findIndex((area) => area.id === areaData.id);
        if (index !== -1) {
            this.wam.areas[index] = structuredClone(areaData);
            return true;
        }
        return false;
    }

    private deleteStaticArea(id: string): boolean {
        const deleted = this.getAreas(AreaType.Static).delete(id);
        if (deleted) {
            return this.deleteAreaFromWAM(id);
        }
        return false;
    }

    public getAreas(areaType: AreaType): Map<string, AreaData> {
        return areaType === AreaType.Dynamic ? this.dynamicAreas : this.staticAreas;
    }

    public getAreaByName(name: string, type: AreaType): AreaData | undefined {
        return Array.from(this.getAreas(type).values()).find((area) => area.name === name);
    }

    public getArea(id: string, type: AreaType): AreaData | undefined {
        return this.getAreas(type).get(id);
    }

    /**
     * Registers a callback called when the user moves inside another area.
     */
    public onEnterArea(callback: AreaChangeCallback) {
        this.enterAreaCallbacks.push(callback);
    }

    /**
     * Registers a callback called when the user moves outside another area.
     */
    public onLeaveArea(callback: AreaChangeCallback) {
        this.leaveAreaCallbacks.push(callback);
    }

    public triggerSpecificAreaOnEnter(area: AreaData): void {
        for (const callback of this.enterAreaCallbacks) {
            callback([area], []);
        }
    }

    public triggerSpecificAreaOnLeave(area: AreaData): void {
        for (const callback of this.leaveAreaCallbacks) {
            callback([area], []);
        }
    }

    public getProperties(position: { x: number; y: number }): Map<string, string | boolean | number> {
        const properties = new Map<string, string | boolean | number>();
        for (const area of this.getAreasOnPosition(position, this.areasPositionOffsetY)) {
            if (area.properties === undefined) {
                continue;
            }
            const flattenedProperties = this.flattenAreaProperties(area.properties);
            for (const key in flattenedProperties) {
                const property = flattenedProperties[key];
                if (property === undefined) {
                    continue;
                }
                properties.set(key, property);
            }
        }
        return properties;
    }

    public setProperty<K extends keyof AreaDataProperties>(area: AreaData, key: K, value: AreaDataProperties[K]): void {
        area.properties[key] = value;
    }

    private getAreasOnPosition(position: { x: number; y: number }, offsetY = 0, areaType?: AreaType): AreaData[] {
        const areasOfInterest = areaType
            ? this.getAreas(areaType).values()
            : [...this.staticAreas.values(), ...this.dynamicAreas.values()];

        const overlappedAreas: AreaData[] = [];
        for (const area of areasOfInterest) {
            if (MathUtils.isOverlappingWithRectangle({ x: position.x, y: position.y + offsetY }, area)) {
                overlappedAreas.push(area);
            }
        }
        return overlappedAreas;
    }
}
