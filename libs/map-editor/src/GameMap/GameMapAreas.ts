import { ITiledMapObject } from "@workadventure/tiled-map-type-guard";
import { MathUtils } from "@workadventure/math-utils";
import { GameMap } from "./GameMap";
import { AreaType, ITiledMapRectangleObject } from '../types';

export type AreaChangeCallback = (
    areasChangedByAction: Array<ITiledMapObject>,
    allAreasOnNewPosition: Array<ITiledMapObject>
) => void;

export class GameMapAreas {
    private gameMap: GameMap;

    private enterAreaCallbacks = Array<AreaChangeCallback>();
    private leaveAreaCallbacks = Array<AreaChangeCallback>();

    /**
     * Areas that we can do CRUD operations on via scripting API
     */
    private readonly dynamicAreas: ITiledMapRectangleObject[] = [];
    /**
     * Areas loaded from Tiled map file
     */
    private readonly staticAreas: ITiledMapRectangleObject[] = [];

    private readonly areasPositionOffsetY: number = 16;
    private readonly staticAreaNamePrefix = "STATIC_AREA_";
    private unnamedStaticAreasCounter = 0;

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;

        // NOTE: We leave "zone" for legacy reasons
        this.gameMap.tiledObjects
            .filter((object) => ["zone", "area"].includes(object.class ?? ""))
            .forEach((area) => {
                let name = area.name;
                if (!name) {
                    name = `${this.staticAreaNamePrefix}${this.unnamedStaticAreasCounter}`;
                    area.name = name;
                    this.unnamedStaticAreasCounter++;
                }
                if (area.width === undefined || area.height === undefined) {
                    console.warn(`Area name "${name}" must be a rectangle`);
                    return;
                }
                this.staticAreas.push(area as ITiledMapRectangleObject);
            });
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
        area: ITiledMapRectangleObject,
        type: AreaType,
        playerPosition?: { x: number; y: number }
    ): void {
        this.getAreas(type).push(area);

        if (playerPosition && this.isPlayerInsideAreaByName(area.name, type, playerPosition)) {
            this.triggerSpecificAreaOnEnter(area);
        }
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
    // TODO: Remove the need of passing by player position. Resolve any callbacks from FrontWrapper perspective!
    public updateAreaByName(
        name: string,
        type: AreaType,
        config: Partial<ITiledMapObject>
    ): ITiledMapRectangleObject | undefined {
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
        config: Partial<ITiledMapRectangleObject>
    ): ITiledMapRectangleObject | undefined {
        const area = this.getArea(id, type);
        if (!area) {
            return;
        }
        this.updateArea(area, config);
        return area;
    }

    public updateArea(area: ITiledMapRectangleObject, config: Partial<ITiledMapObject>): void {
        if (config.x !== undefined) {
            area.x = config.x;
        }
        if (config.y !== undefined) {
            area.y = config.y;
        }
        if (config.width !== undefined) {
            area.width = config.width;
        }
        if (config.height !== undefined) {
            area.height = config.height;
        }
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
        }
    }

    public deleteAreaById(id: number, type: AreaType, playerPosition?: { x: number; y: number }): void {
        if (playerPosition) {
            const area = this.getAreasOnPosition(playerPosition, this.areasPositionOffsetY, type).find((area) => area.id === id);
            if (area) {
                this.triggerSpecificAreaOnLeave(area);
            }
        }
        const areas = this.getAreas(type);
        const index = areas.findIndex((area) => area.id === id);
        if (index !== -1) {
            areas.splice(index, 1);
        }
    }

    public getAreas(areaType: AreaType): ITiledMapRectangleObject[] {
        return areaType === AreaType.Dynamic ? this.dynamicAreas : this.staticAreas;
    }

    public getAreaByName(name: string, type: AreaType): ITiledMapRectangleObject | undefined {
        return this.getAreas(type).find((area) => area.name === name);
    }

    public getArea(id: number, type: AreaType): ITiledMapRectangleObject | undefined {
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

    public triggerSpecificAreaOnEnter(area: ITiledMapRectangleObject): void {
        for (const callback of this.enterAreaCallbacks) {
            callback([area], []);
        }
    }

    public triggerSpecificAreaOnLeave(area: ITiledMapRectangleObject): void {
        for (const callback of this.leaveAreaCallbacks) {
            callback([area], []);
        }
    }

    public getProperties(position: { x: number; y: number }): Map<string, string | boolean | number> {
        const properties = new Map<string, string | boolean | number>();
        for (const area of this.getAreasOnPosition(position, this.areasPositionOffsetY)) {
            if (area.properties !== undefined) {
                for (const property of area.properties) {
                    if (property.value === undefined) {
                        continue;
                    }
                    properties.set(property.name, property.value as string | number | boolean);
                }
            }
        }
        return properties;
    }

    private getAreasOnPosition(
        position: { x: number; y: number },
        offsetY = 0,
        areaType?: AreaType
    ): ITiledMapRectangleObject[] {
        const areasOfInterest = areaType
            ? this.getAreas(areaType).values()
            : [...this.staticAreas.values(), ...this.dynamicAreas.values()];

        const overlappedAreas: ITiledMapRectangleObject[] = [];
        for (const area of areasOfInterest) {
            if (MathUtils.isOverlappingWithRectangle({ x: position.x, y: position.y + offsetY }, area)) {
                overlappedAreas.push(area);
            }
        }
        return overlappedAreas;
    }
}
