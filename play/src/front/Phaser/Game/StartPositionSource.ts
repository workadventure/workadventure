import type { AreaData, GameMap } from "@workadventure/map-editor";
import { GameMapProperties } from "@workadventure/map-editor";
import { MathUtils } from "@workadventure/math-utils";
import type {
    ITiledMapLayer,
    ITiledMapObject,
    ITiledMapProperty,
    ITiledMapTileLayer,
} from "@workadventure/tiled-map-type-guard";

// Type-only: erased at compile time, so this does not close a runtime cycle with the wrapper.
import type { DynamicArea } from "./GameMap/GameMapFrontWrapper";

/**
 * What computing a start position actually needs from a map: five lookups, all of them reads over
 * the TMJ and the WAM.
 *
 * It used to take a GameMapFrontWrapper, which owns Phaser tilemaps and renderable layers — so the
 * start position could not be known before the renderer existed. The lookups themselves never
 * needed any of that. GameMapFrontWrapper satisfies this interface as it stands; so does
 * GameMapStartPositionSource, built from map data alone, which is what lets a session pick its
 * position before a scene exists.
 */
export interface StartPositionSource {
    readonly dynamicAreas: Map<string, DynamicArea>;
    getAreaByName(name: string): AreaData | undefined;
    getAreas(): Map<string, AreaData> | undefined;
    getFlatLayers(): ITiledMapLayer[];
    getRandomPositionFromLayer(layerName: string): { x: number; y: number };
    getGameMap(): GameMap;
    findLayer(layerName: string): ITiledMapLayer | undefined;
    hasStartTile(): boolean;
    isStartObject(obj: ITiledMapLayer | ITiledMapObject): boolean;
    getPropertiesForIndex(index: number): Array<ITiledMapProperty>;
}

/**
 * Tiled "zone"/"area" objects, keyed by name. Note this names the unnamed ones as it goes, which
 * mutates the objects it walks — kept as it was, because names are how areas are addressed later.
 */
export function buildDynamicAreas(gameMap: GameMap): Map<string, DynamicArea> {
    const dynamicAreas = new Map<string, DynamicArea>();
    let nbUnnamedTileArea = 0;

    // NOTE: We leave "zone" for legacy reasons
    gameMap.tiledObjects
        .filter((object) => ["zone", "area"].includes(object.class ?? ""))
        .forEach((tiledArea: ITiledMapObject) => {
            if (!tiledArea.name) {
                tiledArea.name = "unnamed_tiled_area_" + nbUnnamedTileArea;
                nbUnnamedTileArea++;
            }

            if (tiledArea.width === undefined || tiledArea.height === undefined) {
                console.warn("Areas must be square objects. Object " + tiledArea.name + " is not square.");
                return;
            }
            // In case an area already exists with the same name, we rename it to avoid conflicts
            if (dynamicAreas.get(tiledArea.name)) {
                console.warn("There are several '" + tiledArea.name + "' areas existing in your Tiled map.");
                tiledArea.name = "unnamed_tiled_area_" + nbUnnamedTileArea;
                nbUnnamedTileArea++;
            }

            const properties: { [key: string]: unknown } = {};
            for (const tiledProperty of tiledArea.properties ?? []) {
                properties[tiledProperty.name] = tiledProperty.value;
            }

            dynamicAreas.set(tiledArea.name, {
                name: tiledArea.name,
                width: tiledArea.width,
                height: tiledArea.height,
                x: tiledArea.x,
                y: tiledArea.y,
                properties,
            });
        });

    return dynamicAreas;
}

/** A random non-empty tile of a layer, in tile coordinates. */
export function randomPositionFromLayer(gameMap: GameMap, layerName: string): { x: number; y: number } {
    const layer = gameMap.findLayer(layerName) as ITiledMapTileLayer;
    if (!layer) {
        throw new Error(`No layer "${layerName}" was found`);
    }
    const tiles = layer.data;
    if (!tiles) {
        throw new Error(`No tiles in "${layerName}" were found`);
    }
    if (typeof tiles === "string") {
        throw new Error("The content of a JSON map must be filled as a JSON array, not as a string");
    }
    const possiblePositions: { x: number; y: number }[] = [];
    tiles.forEach((objectKey: number, key: number) => {
        if (objectKey === 0) {
            return;
        }
        possiblePositions.push({ x: key % layer.width, y: Math.floor(key / layer.width) });
    });
    if (possiblePositions.length > 0) {
        return MathUtils.randomFromArray(possiblePositions);
    }
    throw new Error(`No possible position found, layer "${layerName}" is empty`);
}

/** The data-only source: everything a start position needs, with no Phaser in sight. */
export class GameMapStartPositionSource implements StartPositionSource {
    public readonly dynamicAreas: Map<string, DynamicArea>;

    constructor(private readonly gameMap: GameMap) {
        this.dynamicAreas = buildDynamicAreas(gameMap);
    }

    public getAreaByName(name: string): AreaData | undefined {
        return this.gameMap.getWamFile()?.getGameMapAreas().getAreaByName(name);
    }

    public getAreas(): Map<string, AreaData> | undefined {
        return this.gameMap.getWamFile()?.getGameMapAreas().getAreas();
    }

    public getFlatLayers(): ITiledMapLayer[] {
        return this.gameMap.flatLayers;
    }

    public getRandomPositionFromLayer(layerName: string): { x: number; y: number } {
        return randomPositionFromLayer(this.gameMap, layerName);
    }

    public getGameMap(): GameMap {
        return this.gameMap;
    }

    public findLayer(layerName: string): ITiledMapLayer | undefined {
        return this.gameMap.findLayer(layerName);
    }

    public hasStartTile(): boolean {
        return this.gameMap.hasStartTile;
    }

    public isStartObject(obj: ITiledMapLayer | ITiledMapObject): boolean {
        if (this.gameMap.getTiledObjectProperty(obj, GameMapProperties.START) == true) {
            return true;
        }
        // legacy reasons
        return this.gameMap.getTiledObjectProperty(obj, GameMapProperties.START_LAYER) == true;
    }

    public getPropertiesForIndex(index: number): Array<ITiledMapProperty> {
        return this.gameMap.getPropertiesForIndex(index);
    }
}
