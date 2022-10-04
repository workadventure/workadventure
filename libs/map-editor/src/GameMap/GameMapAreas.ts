import { ITiledMapObject, ITiledMapObjectLayer, ITiledMapProperty } from "@workadventure/tiled-map-type-guard";
import { MathUtils } from "@workadventure/math-utils";
import { GameMap } from "./GameMap";
import { AreaData, AreaProperties, AreaType } from '../types';

export type AreaChangeCallback = (
    areasChangedByAction: Array<AreaData>,
    allAreasOnNewPosition: Array<AreaData>
) => void;

export class GameMapAreas {
    private gameMap: GameMap;

    private enterAreaCallbacks = Array<AreaChangeCallback>();
    private leaveAreaCallbacks = Array<AreaChangeCallback>();

    /**
     * Areas that we can do CRUD operations on via scripting API
     */
    private readonly dynamicAreas: AreaData[] = [];
    /**
     * Areas loaded from Tiled map file
     */
    private readonly staticAreas: AreaData[] = [];

    private readonly areasPositionOffsetY: number = 16;
    private readonly staticAreaNamePrefix = "STATIC_AREA_";
    private unnamedStaticAreasCounter = 0;

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        // NOTE: We leave "zone" for legacy reasons
        try {
            this.gameMap.tiledObjects
                .filter((object) => ["zone", "area"].includes(object.class ?? ""))
                .forEach((areaRaw: ITiledMapObject) => {
                    this.staticAreas.push(this.tiledObjectToAreaData(areaRaw));
                });
        } catch(e) {
            console.error('CANNOT PARSE TILED OBJECTS TO AREA DATA FORMAT');
        }
    }

    private tiledObjectToAreaData(tiledObject: ITiledMapObject): AreaData {
        let name = tiledObject.name;
        if (!name) {
            name = `${this.staticAreaNamePrefix}${this.unnamedStaticAreasCounter}`;
            tiledObject.name = name;
            this.unnamedStaticAreasCounter++;
        }
        if (tiledObject.width === undefined || tiledObject.height === undefined) {
            throw new Error(`Area name "${name}" must be a rectangle`);
        }
        return {
            name,
            id: tiledObject.id,
            x: tiledObject.x,
            y: tiledObject.y,
            width: tiledObject.width,
            height: tiledObject.height,
            properties: this.mapTiledPropertiesToAreaProperties(tiledObject),
            visible: true,
        }
    }

    private mapTiledPropertiesToAreaProperties(areaRaw: ITiledMapObject): AreaProperties {
        if (!areaRaw.properties) {
            return {};
        }
        const properties: AreaProperties = {};
        for (const rawProperty of areaRaw.properties) {
            const value = rawProperty.value;

            // TODO: Figure out what to do with JSON type
            if (value === undefined || value === null) {
                continue;
            }
            // @ts-ignore
            properties[rawProperty.name] = value;
        }
        return properties;
    }

    private mapAreaPropertiesToTiledProperties(areaProperties: AreaProperties): ITiledMapProperty[] {
        const properties: ITiledMapProperty[] = [];
        for (const key in areaProperties) {
            const data = areaProperties[key];
            if (data === null) {
                continue;
            }
            switch (typeof data) {
                case "string": {
                    properties.push({
                        name: key,
                        type: "string",
                        value: data,
                    });
                    break;
                }
                // save as float to be safe?
                case "number": {
                    properties.push({
                        name: key,
                        type: "float",
                        value: data,
                    });
                    break;
                }
                case "boolean": {
                    properties.push({
                        name: key,
                        type: "bool",
                        value: data,
                    });
                    break;
                }
            }
        }
        return properties;
    }

    private areaDataToTiledObject(areaData: AreaData): ITiledMapObject {
        return {
            id: areaData.id,
            type: "area",
            class: "area",
            name: areaData.name,
            visible: true,
            x: areaData.x,
            y: areaData.y,
            properties: this.mapAreaPropertiesToTiledProperties(areaData.properties),
        }
    }

    /**
     * We use Tiled Objects with type "area" as areas with defined x, y, width and height for easier event triggering.
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
        playerPosition?: { x: number; y: number }
    ): boolean {
        if (this.getAreas(type).find(existingArea => existingArea.id === area.id)) {
            return false;
        }
        const floorLayer = this.gameMap.getMap().layers.find(layer => layer.name === "floorLayer");
        if (floorLayer) {
            const areaDataAsTileObject = this.areaDataToTiledObject(area);
            this.getAreas(type).push(area);
            this.gameMap.incrementNextObjectId();
            (floorLayer as ITiledMapObjectLayer).objects.push(areaDataAsTileObject);
            // as we are making changes to the map itself, we can update tiledObjects helper array too!
            this.gameMap.tiledObjects.push(areaDataAsTileObject);
        }

        if (playerPosition && this.isPlayerInsideAreaByName(area.name, type, playerPosition)) {
            this.triggerSpecificAreaOnEnter(area);
        }
        return true;
    }

    public isPlayerInsideArea(id: number, type: AreaType, playerPosition: { x: number; y: number }): boolean {
        return (
            this.getAreasOnPosition(playerPosition, this.areasPositionOffsetY, type).findIndex((area) => area.id === id) !==
            -1
        );
    }

    public isPlayerInsideAreaByName(
        name: string,
        type: AreaType,
        position: { x: number; y: number }
    ): boolean {
        return (
            this.getAreasOnPosition(position, this.areasPositionOffsetY, type).findIndex(
                (area) => area.name === name
            ) !== -1
        );
    }
    public updateAreaByName(
        name: string,
        type: AreaType,
        config: Partial<AreaData>
    ): AreaData | undefined {
        const area = this.getAreaByName(name, type);
        if (!area) {
            return;
        }
        this.updateArea(area, config);
        return area;
    }

    public updateAreaById(
        id: number,
        type: AreaType,
        config: Partial<AreaData>
    ): AreaData | undefined {
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
        const areas = this.getAreas(type);
        const index = areas.findIndex((area) => area.name === name);
        if (index !== -1) {
            areas.splice(index, 1);
            const areaId = areas.find((area) => area.name === name)?.id;
            if (areaId) {
                this.deleteStaticArea(areaId);
            }
        }
    }

    public deleteAreaById(id: number, type: AreaType, playerPosition?: { x: number; y: number }): boolean {
        if (playerPosition) {
            const area = this.getAreasOnPosition(playerPosition, this.areasPositionOffsetY, type).find((area) => area.id === id);
            if (area) {
                this.triggerSpecificAreaOnLeave(area);
            }
        }
        let success = false;
        const areas = this.getAreas(type);
        const index = areas.findIndex((area) => area.id === id);
        if (index !== -1) {
            areas.splice(index, 1);
            success = this.deleteStaticArea(id);
        }
        return success;
    }

    private updateArea(area: AreaData, config: Partial<AreaData>): void {
        const tiledObject = this.gameMap.tiledObjects.find(object => object.id === area.id);
        if (!tiledObject) {
            throw new Error(`Area of id: ${area.id} has not been mapped to tileObjects array!`);
        }
        if (config.x !== undefined) {
            area.x = config.x;
            tiledObject.x = config.x;
        }
        if (config.y !== undefined) {
            area.y = config.y;
            tiledObject.y = config.y;
        }
        if (config.width !== undefined) {
            area.width = config.width;
            tiledObject.width = config.width;
        }
        if (config.height !== undefined) {
            area.height = config.height;
            tiledObject.height = config.height;
        }
    }

    private deleteStaticArea(id: number): boolean {
        // TODO: TiledObjects is not up to date! They are a reference because only first level of flatLayers objects are deep copied!
        const index = this.gameMap.tiledObjects.findIndex((object) => object.id === id);
        if (index !== -1) {
            this.gameMap.tiledObjects.splice(index, 1);
            return this.gameMap.deleteGameObjectFromMapById(id, this.gameMap.getMap().layers);
        }
        return false;
    }

    public getAreas(areaType: AreaType): AreaData[] {
        return areaType === AreaType.Dynamic ? this.dynamicAreas : this.staticAreas;
    }

    public getAreaByName(name: string, type: AreaType): AreaData | undefined {
        return this.getAreas(type).find((area) => area.name === name);
    }

    public getArea(id: number, type: AreaType): AreaData | undefined {
        return this.getAreas(type).find((area) => area.id === id);
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
            if (area.properties !== undefined) {
                for (const key in area.properties) {
                    const property = area.properties[key];
                    if (property === undefined) {
                        continue;
                    }
                    properties.set(key, property);
                }
            }
        }
        return properties;
    }

    public setProperty(
        holder: { properties: AreaProperties },
        key: string,
        value: string | number | boolean
    ): void {
        holder.properties[key] = value;
    }

    public getProperty(
        holder: { properties: AreaProperties },
        key: string,
    ): string | number | boolean {
        return holder.properties[key];
    }

    private getAreasOnPosition(
        position: { x: number; y: number },
        offsetY = 0,
        areaType?: AreaType
    ): AreaData[] {
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
