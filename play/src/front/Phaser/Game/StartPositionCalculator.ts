import { GameMapProperties } from "@workadventure/map-editor";
import { MathUtils } from "@workadventure/math-utils";
import type {
    ITiledMap,
    ITiledMapLayer,
    ITiledMapObject,
    ITiledMapTileLayer,
} from "@workadventure/tiled-map-type-guard";
import type { PositionInterface } from "../../Connexion/ConnexionModels";
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

        for (const tiledArea of this.gameMapFrontWrapper.getTiledAreas()) {
            if (tiledArea.name === "start") {
                names.push(tiledArea.name);
                continue;
            }
            const properties = tiledArea.properties;
            if (properties) {
                for (const property of properties) {
                    if (property.name === GameMapProperties.START && property.value === true) {
                        names.push(tiledArea.name);
                        break;
                    }
                }
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
            // try to get custom starting position from Area object
            if (!this.initPositionFromTiledArea(this.startPositionName, true)) {
                // try to get custom starting position from Area object
                if (!this.initPositionFromArea(this.startPositionName, true)) {
                    // if cannot, look for custom name Layers
                    if (!this.initPositionFromLayerName(this.startPositionName)) {
                        // if cannot, look for Tile
                        if (!this.initPositionFromTile()) {
                            // if cannot, look for Area with DEFAULT start name
                            if (!this.initPositionFromArea(this.DEFAULT_START_NAME)) {
                                // default name layer
                                this.initPositionFromLayerName();
                            }
                        }
                    }
                }
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

    private initPositionFromTiledArea(startPositionName: string, needStartProperty = false): boolean {
        const tiledAreas = this.gameMapFrontWrapper.getTiledAreas();
        for (const tiledArea of tiledAreas) {
            if (!tiledArea || tiledArea.name !== startPositionName) {
                continue;
            }
            const properties = tiledArea.properties;
            if (needStartProperty && properties) {
                if (!properties.find((property) => property.name === "start")) {
                    return false;
                }
            }
            const tiledAreaRect: { x: number; y: number; width: number; height: number } = {
                x: tiledArea.x,
                y: tiledArea.y,
                width: tiledArea.width ?? 0,
                height: tiledArea.height ?? 0,
            };
            this.startPosition = MathUtils.randomPositionFromRect(tiledAreaRect, 16);
            return true;
        }
        return false;
    }

    private initPositionFromArea(startPositionName: string, needStartProperty = false): boolean {
        const area = this.gameMapFrontWrapper.getAreaByName(startPositionName);
        if (area) {
            if (needStartProperty) {
                if (!area.properties.find((property) => property.type === "start")) {
                    return false;
                }
            }
            this.startPosition = MathUtils.randomPositionFromRect(area, 16);
            return true;
        }
        return false;
    }

    private initPositionFromLayerName(startPositionName?: string): boolean {
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
                        this.startPosition = {
                            x: startPosition.x * (this.mapFile.tilewidth ?? 0) + (this.mapFile.tilewidth ?? 0) / 2,
                            y: startPosition.y * (this.mapFile.tileheight ?? 0) + (this.mapFile.tileheight ?? 0) / 2,
                        };
                        return true;
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
                this.startPosition = {
                    x: startPosition.x * (this.mapFile.tilewidth ?? 0) + (this.mapFile.tilewidth ?? 0) / 2,
                    y: startPosition.y * (this.mapFile.tileheight ?? 0) + (this.mapFile.tileheight ?? 0) / 2,
                };
            } catch (e: unknown) {
                console.error("Error while finding start position: ", e);
            }
            return true;
        }
        return false;
    }

    private initPositionFromTile(): boolean {
        if (!this.gameMapFrontWrapper.hasStartTile()) {
            return false;
        }
        const layer = (this.gameMapFrontWrapper.findLayer(this.startPositionName) ||
            this.gameMapFrontWrapper.findLayer(this.DEFAULT_START_NAME)) as ITiledMapTileLayer | undefined;
        if (!layer) {
            return false;
        }
        const tiles = layer.data;
        if (typeof tiles === "string") {
            return false;
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
                !properties.some((property) => property.name == "start" && property.value == this.startPositionName)
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
            return false;
        }
        // Choose one of the available start positions at random amongst the list of available start positions.
        this.startPosition = possibleStartPositions[Math.floor(Math.random() * possibleStartPositions.length)];
        return true;
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
