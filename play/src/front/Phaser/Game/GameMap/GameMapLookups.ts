import type { GameMap } from "@workadventure/map-editor";
import { MathUtils } from "@workadventure/math-utils";
import type { ITiledMapObject, ITiledMapTileLayer } from "@workadventure/tiled-map-type-guard";

// Type-only: erased at compile time, so this does not close a runtime cycle with the wrapper.
import type { DynamicArea } from "./GameMapFrontWrapper";

/**
 * Reads over the Tiled map that GameMapFrontWrapper used to do inline. They are here because they
 * need no Phaser at all, which both shortens the wrapper and lets them be tested on their own.
 */

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
