import { AreaData, AreaDataProperties, GameMapProperties } from "../types";
import { AreaType } from "../types";
import * as _ from "lodash";
import { MathUtils } from "@workadventure/math-utils";
import type { GameMap } from "./GameMap";
import { ITiledMapObject, ITiledMapProperty, Json } from "@workadventure/tiled-map-type-guard";

export type AreaChangeCallback = (
    areasChangedByAction: Array<AreaData>,
    allAreasOnNewPosition: Array<AreaData>
) => void;

export class GameMapAreas {
    private gameMap: GameMap;

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

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        const areasData: unknown = structuredClone(this.getAreasMapProperty()?.value ?? []);

        for (const areaData of (areasData as AreaData[]) ?? []) {
            this.addArea(areaData, AreaType.Static, false);
        }
    }

    public mapAreaToTiledObject(areaData: AreaData): Omit<ITiledMapObject, "id"> & { id?: string | number } {
        return {
            id: areaData.id,
            type: "area",
            class: "area",
            name: areaData.name,
            visible: true,
            x: areaData.x,
            y: areaData.y,
            width: areaData.width,
            height: areaData.height,
            properties: this.mapAreaPropertiesToTiledProperties(areaData.properties),
        };
    }

    private mapAreaPropertiesToTiledProperties(areaProperties: AreaDataProperties): ITiledMapProperty[] {
        const properties: ITiledMapProperty[] = [];

        if (areaProperties.focusable) {
            properties.push({ name: GameMapProperties.FOCUSABLE, type: "bool", value: true });
            if (areaProperties.focusable.zoom_margin) {
                properties.push({
                    name: GameMapProperties.ZOOM_MARGIN,
                    type: "float",
                    value: areaProperties.focusable.zoom_margin,
                });
            }
        }
        if (areaProperties.jitsiRoom) {
            properties.push({
                name: GameMapProperties.JITSI_ROOM,
                type: "string",
                value: areaProperties.jitsiRoom.roomName ?? "",
            });
            if (areaProperties.jitsiRoom.jitsiRoomConfig) {
                properties.push({
                    name: GameMapProperties.JITSI_CONFIG,
                    type: "class",
                    value: areaProperties.jitsiRoom.jitsiRoomConfig,
                });
            }
        }
        if (areaProperties.openWebsite) {
            if (areaProperties.openWebsite.newTab) {
                properties.push({
                    name: GameMapProperties.OPEN_TAB,
                    type: "string",
                    value: areaProperties.openWebsite.link,
                });
            } else {
                properties.push({
                    name: GameMapProperties.OPEN_WEBSITE,
                    type: "string",
                    value: areaProperties.openWebsite.link,
                });
            }
        }
        if (areaProperties.playAudio) {
            properties.push({
                name: GameMapProperties.PLAY_AUDIO,
                type: "string",
                value: areaProperties.playAudio.audioLink,
            });
        }

        return properties;
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
        addToMapProperties = true,
        playerPosition?: { x: number; y: number }
    ): boolean {
        if (this.getAreas(type).has(area.id)) {
            return false;
        }
        this.getAreas(type).set(area.id, area);

        if (playerPosition && this.isPlayerInsideAreaByName(area.name, type, playerPosition)) {
            this.triggerSpecificAreaOnEnter(area);
        }

        if (addToMapProperties) {
            return this.addAreaToMapProperties(area);
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
        this.updateAreaInMapProperties(area);
    }

    private addAreaToMapProperties(areaData: AreaData): boolean {
        if (this.gameMap.getMap().properties === undefined) {
            this.gameMap.getMap().properties = [];
        }
        if (!this.getAreasMapProperty()) {
            this.gameMap.getMap().properties?.push({
                name: this.MAP_PROPERTY_AREAS_NAME,
                type: "class",
                value: JSON.parse(JSON.stringify([])) as Json,
            });
        }
        const areasPropertyValues = JSON.parse(JSON.stringify(this.getAreasMapProperty()?.value)) as AreaData[];

        if (areasPropertyValues.find((area) => area.id === areaData.id)) {
            console.warn(`ADD AREA FAIL: AREA OF ID ${areaData.id} ALREADY EXISTS WITHIN THE GAMEMAP!`);
            return false;
        }
        areasPropertyValues.push(areaData);

        const areasMapProperty = this.getAreasMapProperty();
        if (areasMapProperty !== undefined) {
            areasMapProperty.value = structuredClone(areasPropertyValues) as unknown as Json;
        }

        return true;
    }

    private deleteAreaFromMapProperties(id: string): boolean {
        const areasPropertyValues = JSON.parse(JSON.stringify(this.getAreasMapProperty()?.value)) as AreaData[];
        const indexToRemove = areasPropertyValues.findIndex((areaData) => areaData.id === id);
        if (indexToRemove !== -1) {
            areasPropertyValues.splice(indexToRemove, 1);
            const areasMapProperty = this.getAreasMapProperty();
            if (areasMapProperty !== undefined) {
                areasMapProperty.value = JSON.parse(JSON.stringify(areasPropertyValues)) as Json;
                return true;
            } else {
                return false;
            }
        }
        return false;
    }

    private updateAreaInMapProperties(areaData: AreaData): boolean {
        const areasPropertyValue = this.getAreasMapProperty()?.value as AreaData[];

        const areaIndex = areasPropertyValue.findIndex((area) => area.id === areaData.id);

        if (areaIndex === -1) {
            console.warn(`CANNOT FIND AREA WITH ID: ${areaData.id} IN MAP PROPERTIES!`);
            return false;
        }

        const areasMapProperty = this.getAreasMapProperty();
        if (areasMapProperty !== undefined) {
            areasPropertyValue[areaIndex] = areaData;
            areasMapProperty.value = JSON.parse(JSON.stringify(areasPropertyValue)) as Json;
            return true;
        }
        return false;
    }

    private getAreasMapProperty(): ITiledMapProperty | undefined {
        return this.gameMap.getMapPropertyByKey(this.MAP_PROPERTY_AREAS_NAME);
    }

    private deleteStaticArea(id: string): boolean {
        const deleted = this.getAreas(AreaType.Static).delete(id);
        if (deleted) {
            return this.deleteAreaFromMapProperties(id);
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

    public setProperty(area: AreaData, key: string, value: string | number | boolean | undefined): void {
        // switch (key) {
        //     case "focusable": {
        //         if (typeof value === "boolean" || value === undefined) {
        //             area.properties.focusable = value;
        //         }
        //         break;
        //     }
        //     case "zoomMargin": {
        //         if (typeof value === "number" || value === undefined) {
        //             area.properties.zoomMargin = value;
        //         }
        //         break;
        //     }
        //     case "silent": {
        //         if (typeof value === "boolean" || value === undefined) {
        //             area.properties.silent = value;
        //         }
        //         break;
        //     }
        //     default: {
        //         area.properties.customProperties[key] = value;
        //     }
        // }
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
