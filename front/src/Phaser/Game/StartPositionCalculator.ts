import type { PositionInterface } from "../../Connexion/ConnexionModels";
import { MathUtils } from "../../Utils/MathUtils";
import type { ITiledMap, ITiledMapLayer, ITiledMapObject } from "../Map/ITiledMap";
import type { GameMap } from "./GameMap";
import { GameMapProperties } from "./GameMapProperties";
export class StartPositionCalculator {
    public startPosition!: PositionInterface;

    private startPositionName: string;

    private readonly DEFAULT_START_NAME = "start";

    constructor(
        private readonly gameMap: GameMap,
        private readonly mapFile: ITiledMap,
        private readonly initPosition?: PositionInterface,
        startPositionName?: string
    ) {
        this.startPositionName = startPositionName || this.DEFAULT_START_NAME;
        this.initStartXAndStartY();
    }

    public getStartPositionNames(): string[] {
        const names: string[] = [];
        for (const obj of [...this.gameMap.flatLayers, ...this.gameMap.getAreas()]) {
            if (obj.name === "start") {
                names.push(obj.name);
                continue;
            }
            if (this.isStartObject(obj)) {
                names.push(obj.name);
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
            // try to get starting position from Area object
            if (!this.initPositionFromArea()) {
                // if cannot, look for Layers
                this.initPositionFromLayerName(this.startPositionName);
            }
        }
        // Still no start position? Something is wrong with the map, we need a "start" layer.
        if (this.startPosition === undefined) {
            console.warn(
                'This map is missing a layer named "start" that contains the available default start positions.'
            );
            // Let's start in the middle of the map
            this.startPosition = {
                x: this.mapFile.width * 16,
                y: this.mapFile.height * 16,
            };
        }
    }

    private initPositionFromArea(): boolean {
        let area = this.gameMap.getArea(this.startPositionName);
        if (area && this.gameMap.getObjectProperty(area, "start") === true) {
            this.startPosition = MathUtils.randomPositionFromRect(area, 16);
            return true;
        }

        area = this.gameMap.getArea(this.DEFAULT_START_NAME);
        if (area) {
            this.startPosition = MathUtils.randomPositionFromRect(area, 16);
            return true;
        }
        return false;
    }

    private initPositionFromLayerName(selectedLayerName: string) {
        let foundLayer: ITiledMapLayer | null = null;

        const tileLayers = this.gameMap.flatLayers.filter((layer) => layer.type === "tilelayer");
        for (const layer of tileLayers) {
            //we want to prioritize the selectedLayer rather than "start" layer
            if (
                [layer.name, `#${layer.name}`].includes(selectedLayerName) ||
                layer.name.endsWith("/" + selectedLayerName)
            ) {
                foundLayer = layer;
                break;
            }
        }
        if (!foundLayer) {
            for (const layer of tileLayers) {
                if (layer.name === this.DEFAULT_START_NAME || this.isStartObject(layer)) {
                    foundLayer = layer;
                    break;
                }
            }
        }
        if (foundLayer) {
            const startPosition = this.gameMap.getRandomPositionFromLayer(foundLayer.name);
            this.startPosition = {
                x: startPosition.x * this.mapFile.tilewidth + this.mapFile.tilewidth / 2,
                y: startPosition.y * this.mapFile.tileheight + this.mapFile.tileheight / 2,
            };
        }
    }

    private isStartObject(obj: ITiledMapLayer | ITiledMapObject): boolean {
        if (this.gameMap.getObjectProperty(obj, GameMapProperties.START) == true) {
            return true;
        }
        // legacy reasons
        return this.gameMap.getObjectProperty(obj, GameMapProperties.START_LAYER) == true;
    }

    public getStartPositionName(): string {
        return this.startPositionName;
    }
}
