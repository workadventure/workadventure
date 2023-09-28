import { AreaData, GameMapProperties } from "@workadventure/map-editor";
import { MathUtils } from "@workadventure/math-utils";
import type { ITiledMap, ITiledMapLayer, ITiledMapObject } from "@workadventure/tiled-map-type-guard";
import type { PositionInterface } from "../../Connection/ConnexionModels";
import type { GameMapFrontWrapper } from "./GameMap/GameMapFrontWrapper";
export class StartPositionCalculator {
    public startPosition!: PositionInterface;

    private startPositionName: string;

    private readonly DEFAULT_START_NAME = "start";

    constructor(
        private readonly gameMapFrontWrapper: GameMapFrontWrapper,
        private readonly mapFile: ITiledMap,
        private readonly initPosition?: PositionInterface,
        startPositionName?: string
    ) {
        this.startPositionName = startPositionName || "";
        this.initStartXAndStartY();
    }

    public getStartPositionNames(): string[] {
        const names: string[] = [];
        for (const obj of this.gameMapFrontWrapper.getFlatLayers()) {
            if (obj.name === "start") {
                names.push(obj.name);
                continue;
            }
            if (this.isStartObject(obj)) {
                names.push(obj.name);
            }
        }

        for (const dynamicArea of this.gameMapFrontWrapper.dynamicAreas.values()) {
            if (dynamicArea.name === "start") {
                names.push(dynamicArea.name);
                continue;
            }
            const properties = dynamicArea.properties;
            if (properties && properties[GameMapProperties.START] === true) {
                names.push(dynamicArea.name);
            }
        }

        const areas = this.gameMapFrontWrapper.getAreas();

        if (areas) {
            for (const area of Array.from(areas.values())) {
                if (area.name === "start" || area.properties.find((property) => property.type === "start")) {
                    names.push(area.name);
                }
            }
        }
        return names;
    }

    public initStartXAndStartY(startPositionName?: string) {
        // If there is an init position passed
        if (this.initPosition) {
            this.startPosition = this.initPosition;
        } else {
            if (startPositionName) {
                this.startPositionName = startPositionName;
            }
            let startPosition: PositionInterface | undefined = undefined;

            if (this.startPositionName) {
                // try to get custom starting position from a map-editor area object with the correct area name
                startPosition = this.getStartPositionFromArea(this.startPositionName);
                if (startPosition) {
                    this.startPosition = startPosition;
                    return;
                }

                // try to get custom starting position from Area object
                startPosition = this.getStartPositionFromTiledArea(this.startPositionName, true);
                if (startPosition) {
                    this.startPosition = startPosition;
                    return;
                }

                // if not found, look for custom name Layers
                startPosition = this.getStartPositionFromLayerName(this.startPositionName);
                if (startPosition) {
                    this.startPosition = startPosition;
                    return;
                }

                // if not found, look for Tile
                startPosition = this.getStartPositionFromTile(this.startPositionName);
                if (startPosition) {
                    this.startPosition = startPosition;
                    return;
                }
            }

            // if not found, look for map-editor areas with DEFAULT property set
            startPosition = this.getStartPositionFromDefaultStartArea();
            if (startPosition) {
                this.startPosition = startPosition;
                return;
            }

            // try to get custom starting position from Area object
            startPosition = this.getStartPositionFromTiledArea(this.DEFAULT_START_NAME, false);
            if (startPosition) {
                this.startPosition = startPosition;
                return;
            }

            // if not found, look for Tile
            startPosition = this.getStartPositionFromTile(this.DEFAULT_START_NAME);
            if (startPosition) {
                this.startPosition = startPosition;
                return;
            }

            // default name layer
            startPosition = this.getStartPositionFromLayerName();
            if (startPosition) {
                this.startPosition = startPosition;
                return;
            }
        }
        // Still no start position? Something is wrong with the map, we need a "start" layer.
        if (this.startPosition === undefined) {
            console.warn(
                'This map is missing a layer named "start" that contains the available default start positions.'
            );
            // Let's start in the middle of the map
            this.startPosition = {
                x: (this.mapFile.width ?? 0) * 16,
                y: (this.mapFile.height ?? 0) * 16,
            };
        }
    }

    private getStartPositionFromTiledArea(
        startPositionName: string,
        needStartProperty = false
    ): PositionInterface | undefined {
        const tiledAreas = this.gameMapFrontWrapper.dynamicAreas;
        for (const [name, tiledArea] of tiledAreas.entries()) {
            if (!tiledArea || name !== startPositionName) {
                continue;
            }
            const properties = tiledArea.properties;
            if (needStartProperty && properties) {
                if (!properties["start"]) {
                    return undefined;
                }
            }
            const tiledAreaRect: { x: number; y: number; width: number; height: number } = {
                x: tiledArea.x,
                y: tiledArea.y,
                width: tiledArea.width ?? 0,
                height: tiledArea.height ?? 0,
            };
            return MathUtils.randomPositionFromRect(tiledAreaRect, 16);
        }
        return undefined;
    }

    /**
     * Look in the map-editor areas for an area with the name "startPositionName" and a property "start".
     */
    private getStartPositionFromArea(startPositionName: string): PositionInterface | undefined {
        const area = this.gameMapFrontWrapper.getAreaByName(startPositionName);
        if (area) {
            if (!area.properties.find((property) => property.type === "start")) {
                return undefined;
            }
            return MathUtils.randomPositionFromRect(area, 16);
        }
        return undefined;
    }

    private getStartPositionFromDefaultStartArea(): PositionInterface | undefined {
        const areas = this.gameMapFrontWrapper.getAreas();

        const defaultStartAreas: AreaData[] = [];

        for (const area of areas?.values() ?? []) {
            for (const properties of area.properties) {
                if (properties.type === "start" && properties.isDefault === true) {
                    defaultStartAreas.push(area);
                }
            }
        }

        if (defaultStartAreas.length === 0) {
            return undefined;
        }

        return StartPositionCalculator.randomPositionFromRects(defaultStartAreas);
    }

    /**
     * Return a random position in one of the rectangles passed in parameter
     */
    private static randomPositionFromRects(
        rectangles: { x: number; y: number; width: number; height: number }[],
        margin = 0
    ): { x: number; y: number } {
        const rectangle = rectangles[Math.floor(Math.random() * rectangles.length)];
        return MathUtils.randomPositionFromRect(rectangle, margin);
    }

    private getStartPositionFromLayerName(startPositionName?: string): PositionInterface | undefined {
        let foundLayer: ITiledMapLayer | undefined = undefined;

        const tileLayers = this.gameMapFrontWrapper.getFlatLayers().filter((layer) => layer.type === "tilelayer");

        if (startPositionName) {
            for (const layer of tileLayers) {
                //we want to prioritize the selectedLayer rather than "start" layer
                if (
                    [layer.name, `#${layer.name}`].includes(startPositionName) ||
                    layer.name.endsWith("/" + startPositionName)
                ) {
                    try {
                        const startPosition = this.gameMapFrontWrapper.getRandomPositionFromLayer(layer.name);
                        return {
                            x: startPosition.x * (this.mapFile.tilewidth ?? 0) + (this.mapFile.tilewidth ?? 0) / 2,
                            y: startPosition.y * (this.mapFile.tileheight ?? 0) + (this.mapFile.tileheight ?? 0) / 2,
                        };
                    } catch (e: unknown) {
                        console.error("Error while finding start position: ", e);
                    }
                }
            }
        } else {
            foundLayer = tileLayers.find(
                (layer) => layer.name === this.DEFAULT_START_NAME || layer.name.endsWith("/" + this.DEFAULT_START_NAME)
            );
            if (!foundLayer) {
                for (const layer of tileLayers) {
                    if (this.isStartObject(layer)) {
                        foundLayer = layer;
                        break;
                    }
                }
            }
        }
        if (foundLayer) {
            try {
                const startPosition = this.gameMapFrontWrapper.getRandomPositionFromLayer(foundLayer.name);
                return {
                    x: startPosition.x * (this.mapFile.tilewidth ?? 0) + (this.mapFile.tilewidth ?? 0) / 2,
                    y: startPosition.y * (this.mapFile.tileheight ?? 0) + (this.mapFile.tileheight ?? 0) / 2,
                };
            } catch (e: unknown) {
                console.error("Error while finding start position: ", e);
            }
        }
        return undefined;
    }

    private getStartPositionFromTile(startPositionName: string): PositionInterface | undefined {
        if (!this.gameMapFrontWrapper.hasStartTile()) {
            return undefined;
        }
        const layer = this.gameMapFrontWrapper.findLayer(startPositionName);
        if (!layer) {
            return undefined;
        }
        if (layer.type !== "tilelayer") {
            return undefined;
        }
        const tiles = layer.data;
        if (typeof tiles === "string") {
            return undefined;
        }
        const possibleStartPositions: PositionInterface[] = [];
        tiles.forEach((objectKey: number, key: number) => {
            if (objectKey === 0 || !layer) {
                return;
            }
            const y = Math.floor(key / layer.width);
            const x = key % layer.width;

            const properties = this.gameMapFrontWrapper.getPropertiesForIndex(objectKey);
            if (
                !properties.length ||
                !properties.some((property) => property.name == "start" && property.value == startPositionName)
            ) {
                return;
            }
            possibleStartPositions.push({
                x: x * (this.mapFile.tilewidth ?? 0) + (this.mapFile.tilewidth ?? 0) / 2,
                y: y * (this.mapFile.tileheight ?? 0) + (this.mapFile.tileheight ?? 0) / 2,
            });
        });
        // Get a value at random amongst allowed values
        if (possibleStartPositions.length === 0) {
            return undefined;
        }
        // Choose one of the available start positions at random amongst the list of available start positions.
        return possibleStartPositions[Math.floor(Math.random() * possibleStartPositions.length)];
    }

    private isStartObject(obj: ITiledMapLayer | ITiledMapObject): boolean {
        if (this.gameMapFrontWrapper.getTiledObjectProperty(obj, GameMapProperties.START) == true) {
            return true;
        }
        // legacy reasons
        return this.gameMapFrontWrapper.getTiledObjectProperty(obj, GameMapProperties.START_LAYER) == true;
    }

    public getStartPositionName(): string {
        return this.startPositionName;
    }
}
