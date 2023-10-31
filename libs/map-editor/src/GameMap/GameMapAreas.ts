import * as _ from "lodash";
import { MathUtils } from "@workadventure/math-utils";
import { AreaData, AreaDataProperties, AtLeast, GameMapProperties, WAMFileFormat } from "../types";

export type AreaChangeCallback = (
    areasChangedByAction: Array<AreaData>,
    allAreasOnNewPosition: Array<AreaData>
) => void;

export type AreaUpdateCallback = (
    area: AreaData,
    oldProperties: AreaDataProperties | undefined,
    newProperties: AreaDataProperties | undefined
) => void;

export class GameMapAreas {
    private wam: WAMFileFormat;

    private enterAreaCallbacks = Array<AreaChangeCallback>();
    private updateAreaCallbacks = Array<AreaUpdateCallback>();
    private leaveAreaCallbacks = Array<AreaChangeCallback>();

    /**
     * Areas created from within map-editor
     */
    private readonly areas: Map<string, AreaData> = new Map<string, AreaData>();
    private readonly areasPositionOffsetY: number = 16;

    constructor(wam: WAMFileFormat) {
        this.wam = wam;

        for (const areaData of this.wam.areas) {
            this.addArea(areaData, false);
        }
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

    public addArea(area: AreaData, addToWAM = true, playerPosition?: { x: number; y: number }): boolean {
        if (this.areas.has(area.id)) {
            return false;
        }
        this.areas.set(area.id, area);

        if (playerPosition && this.isPlayerInsideAreaByName(area.name, playerPosition)) {
            this.triggerSpecificAreaOnEnter(area);
        }

        if (addToWAM) {
            return this.addAreaToWAM(area);
        }
        return true;
    }

    public isPlayerInsideArea(id: string, playerPosition: { x: number; y: number }): boolean {
        return (
            this.getAreasOnPosition(playerPosition, this.areasPositionOffsetY).findIndex((area) => area.id === id) !==
            -1
        );
    }

    public isPlayerInsideAreaByName(name: string, position: { x: number; y: number }): boolean {
        return (
            this.getAreasOnPosition(position, this.areasPositionOffsetY).findIndex((area) => area.name === name) !== -1
        );
    }

    public updateArea(newConfig: AtLeast<AreaData, "id">): AreaData | undefined {
        const area = this.areas.get(newConfig.id);
        if (!area) {
            throw new Error(`Area to update does not exist!`);
        }

        _.merge(area, newConfig);
        // TODO: Find a way to update it without need of using conditions

        if (newConfig.properties !== undefined) {
            area.properties = newConfig.properties;
        }

        this.updateAreaWAM(area);
        return area;
    }

    public deleteArea(id: string): boolean {
        const deleted = this.areas.delete(id);
        if (deleted) {
            return this.deleteAreaFromWAM(id);
        }
        return false;
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

    public getAreas(): Map<string, AreaData> {
        return this.areas;
    }

    public getAreaByName(name: string): AreaData | undefined {
        return Array.from(this.areas.values()).find((area) => area.name === name);
    }

    public getArea(id: string): AreaData | undefined {
        return this.areas.get(id);
    }

    /**
     * Registers a callback called when the user moves inside another area.
     */
    public onEnterArea(callback: AreaChangeCallback) {
        this.enterAreaCallbacks.push(callback);
    }

    /**
     * Registers a callback called when an area is update.
     */
    public onUpdateArea(callback: AreaUpdateCallback) {
        this.updateAreaCallbacks.push(callback);
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

    public triggerSpecificAreaOnUpdate(
        area: AreaData,
        oldProperties: AreaDataProperties | undefined,
        newProperties: AreaDataProperties | undefined
    ): void {
        for (const callback of this.updateAreaCallbacks) {
            callback(area, oldProperties, newProperties);
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

    private flattenAreaProperties(areaProperties: AreaDataProperties): Record<string, string | boolean | number> {
        const flattenedProperties: Record<string, string | boolean | number> = {};
        for (const property of areaProperties) {
            switch (property.type) {
                case "focusable": {
                    flattenedProperties[GameMapProperties.FOCUSABLE] = true;
                    if (property.zoom_margin) {
                        flattenedProperties[GameMapProperties.ZOOM_MARGIN] = property.zoom_margin;
                    }
                    break;
                }
                case "jitsiRoomProperty": {
                    flattenedProperties[GameMapProperties.JITSI_ROOM] = property.roomName ?? "";
                    if (property.jitsiRoomConfig) {
                        flattenedProperties[GameMapProperties.JITSI_CONFIG] = JSON.stringify(property.jitsiRoomConfig);
                    }
                    break;
                }
                case "openWebsite": {
                    if (property.link == undefined) break;
                    if (property.newTab) {
                        flattenedProperties[GameMapProperties.OPEN_TAB] = property.link;
                    } else {
                        flattenedProperties[GameMapProperties.OPEN_WEBSITE] = property.link;
                    }
                    break;
                }
                case "playAudio": {
                    flattenedProperties[GameMapProperties.PLAY_AUDIO] = property.audioLink;
                    break;
                }
                case "start": {
                    flattenedProperties[GameMapProperties.START] = true;
                    break;
                }
                case "exit": {
                    flattenedProperties[GameMapProperties.EXIT_URL] = property.url;
                    break;
                }
                case "silent": {
                    flattenedProperties[GameMapProperties.SILENT] = true;
                    break;
                }
                case "speakerMegaphone": {
                    flattenedProperties[GameMapProperties.SPEAKER_MEGAPHONE] = property.name;
                    break;
                }
                case "listenerMegaphone": {
                    flattenedProperties[GameMapProperties.LISTENER_MEGAPHONE] = property.speakerZoneName;
                    break;
                }
            }
        }
        return flattenedProperties;
    }

    private getAreasOnPosition(position: { x: number; y: number }, offsetY = 0): AreaData[] {
        const areasOfInterest = [...this.areas.values()];

        const overlappedAreas: AreaData[] = [];
        for (const area of areasOfInterest) {
            if (MathUtils.isOverlappingWithRectangle({ x: position.x, y: position.y + offsetY }, area)) {
                overlappedAreas.push(area);
            }
        }
        return overlappedAreas;
    }
}
