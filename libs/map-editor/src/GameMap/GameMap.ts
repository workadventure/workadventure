import {
    ITiledMap,
    ITiledMapLayer,
    ITiledMapObject,
    ITiledMapProperty,
    ITiledMapTile,
    upgradeMapToNewest,
} from "@workadventure/tiled-map-type-guard";
import type { AreaData } from '../types';
import type { AreaChangeCallback } from "./GameMapAreas";
import { GameMapAreas } from "./GameMapAreas";
import { GameMapProperties } from '../types';
import { flattenGroupLayersMap } from './LayersFlattener';
import { GameMapEntities } from './GameMapEntities';



/**
 * A wrapper around a ITiledMap interface to provide additional capabilities.
 */
export class GameMap {
    /**
     * Component responsible for holding gameMap Areas related logic
     */
    private gameMapAreas: GameMapAreas;
    /**
     * Component responsible for holding gameMap entities related logic
     */
    private gameMapEntities: GameMapEntities;


    private readonly map: ITiledMap;
    private tileNameMap = new Map<string, number>();

    private tileSetPropertyMap: { [tile_index: number]: Array<ITiledMapProperty> } = {};
    public readonly flatLayers: ITiledMapLayer[];
    public readonly tiledObjects: ITiledMapObject[];

    private readonly DEFAULT_TILE_SIZE = 32;
    private readonly MAP_PROPERTY_LATEST_COMMAND_ID_KEY: string = 'latestCommandId';


    public exitUrls: Array<string> = [];

    public hasStartTile = false;

    public constructor(map: ITiledMap) {
        this.map = upgradeMapToNewest(map);
        this.flatLayers = flattenGroupLayersMap(this.map);
        this.tiledObjects = GameMap.getObjectsFromLayers(this.flatLayers);

        this.gameMapAreas = new GameMapAreas(this);
        this.gameMapEntities = new GameMapEntities(this);

        for (const tileset of this.map.tilesets) {
            tileset?.tiles?.forEach((tile) => {
                if (tile.properties && tileset.firstgid !== undefined) {
                    this.tileSetPropertyMap[tileset.firstgid + tile.id] = tile.properties;
                    tile.properties.forEach((prop) => {
                        if (
                            prop.name == GameMapProperties.NAME &&
                            typeof prop.value == "string" &&
                            tileset.firstgid !== undefined
                        ) {
                            this.tileNameMap.set(prop.value, tileset.firstgid + tile.id);
                        }
                        if (prop.name == GameMapProperties.EXIT_URL && typeof prop.value == "string") {
                            this.exitUrls.push(prop.value);
                        } else if (prop.name == GameMapProperties.START) {
                            this.hasStartTile = true;
                        }
                    });
                }
            });
        }
    }

    public getPropertiesForIndex(index: number): Array<ITiledMapProperty> {
        if (this.tileSetPropertyMap[index]) {
            return this.tileSetPropertyMap[index];
        }
        return [];
    }

    public getTileDimensions(): { width: number; height: number } {
        return {
            width: this.map.tilewidth ?? this.DEFAULT_TILE_SIZE,
            height: this.map.tileheight ?? this.DEFAULT_TILE_SIZE,
        };
    }

    public getTileIndexAt(x: number, y: number): { x: number; y: number } {
        return {
            x: Math.floor(x / (this.map.tilewidth ?? this.DEFAULT_TILE_SIZE)),
            y: Math.floor(y / (this.map.tileheight ?? this.DEFAULT_TILE_SIZE)),
        };
    }

    public getTileInformationFromTileset(tilesetName: string, tileIndex: number): ITiledMapTile | undefined {
        return this.map.tilesets.find(tile => tile.name === tilesetName)?.tiles?.find(tile => tile.id === tileIndex);
    }

    public getMap(): ITiledMap {
        return this.map;
    }

    public findLayer(layerName: string): ITiledMapLayer | undefined {
        return this.flatLayers.find((layer) => layer.name === layerName);
    }

    public findObject(objectName: string, objectClass?: string): ITiledMapObject | undefined {
        const object = this.getObjectWithName(objectName);
        return !objectClass ? object : objectClass === object?.class ? object : undefined;
    }

    public getIndexForTileType(tile: string | number): number | undefined {
        if (typeof tile == "number") {
            return tile;
        }
        return this.tileNameMap.get(tile);
    }

    public setTiledObjectProperty(
        holder: { properties?: ITiledMapProperty[] },
        propertyName: string,
        propertyValue: string | number | undefined | boolean
    ): void {
        if (holder.properties === undefined) {
            holder.properties = [];
        }
        const property = holder.properties.find((property) => property.name === propertyName);
        if (property === undefined) {
            if (propertyValue === undefined) {
                return;
            }
            if (typeof propertyValue === "string") {
                holder.properties.push({ name: propertyName, type: "string", value: propertyValue });
            } else if (typeof propertyValue === "number") {
                holder.properties.push({ name: propertyName, type: "float", value: propertyValue });
            } else {
                holder.properties.push({ name: propertyName, type: "bool", value: propertyValue });
            }
            return;
        }
        if (propertyValue === undefined) {
            const index = holder.properties.indexOf(property);
            holder.properties.splice(index, 1);
        }
        property.value = propertyValue;
    }

    public setAreaProperty(
        area: AreaData,
        key: string,
        value: string | number | boolean | undefined
    ): void {
        this.gameMapAreas.setProperty(area, key, value);
    }

    public getTiledObjectProperty(
        object: { properties?: ITiledMapProperty[] },
        propertyName: string
    ): string | boolean | number | undefined {
        const properties: ITiledMapProperty[] | undefined = object.properties;
        if (!properties) {
            return undefined;
        }
        const obj = properties.find(
            (property: ITiledMapProperty) => property.name.toLowerCase() === propertyName.toLowerCase()
        );
        if (obj === undefined) {
            return undefined;
        }
        return obj.value as string | boolean | number | undefined;
    }

    public getObjectWithName(name: string): ITiledMapObject | undefined {
        return this.tiledObjects.find((object) => object.name === name);
    }

    /**
     * Registers a callback called when the user moves inside another area.
     */
    public onEnterArea(callback: AreaChangeCallback) {
        this.gameMapAreas.onEnterArea(callback);
    }

    public getTileProperty(index: number): Array<ITiledMapProperty> {
        if (this.tileSetPropertyMap[index]) {
            return this.tileSetPropertyMap[index];
        }
        return [];
    }

    public putTileInFlatLayer(index: number, x: number, y: number, layer: string): void {
        const fLayer = this.findLayer(layer);
        if (fLayer == undefined) {
            console.error("The layer '" + layer + "' that you want to change doesn't exist.");
            return;
        }
        if (fLayer.type !== "tilelayer") {
            console.error(
                "The layer '" +
                    layer +
                    "' that you want to change is not a tilelayer. Tile can only be put in tilelayer."
            );
            return;
        }
        if (typeof fLayer.data === "string") {
            console.error("Data of the layer '" + layer + "' that you want to change is only readable.");
            return;
        }
        fLayer.data[x + y * fLayer.width] = index;
    }

    public getLayersByKey(key: number): Array<ITiledMapLayer> {
        return this.flatLayers.filter((flatLayer) => flatLayer.type === "tilelayer" && flatLayer.data[key] !== 0);
    }

    private static getObjectsFromLayers(layers: ITiledMapLayer[]): ITiledMapObject[] {
        const objects: ITiledMapObject[] = [];

        const objectLayers = layers.filter((layer) => layer.type === "objectgroup");
        for (const objectLayer of objectLayers) {
            if (objectLayer.type === "objectgroup") {
                objects.push(...objectLayer.objects);
            }
        }

        return objects;
    }

    public updateLatestCommandIdProperty(commandId: string): void {
        const property = this.getMapPropertyByKey(this.MAP_PROPERTY_LATEST_COMMAND_ID_KEY);
        if (!property) {
            this.map.properties?.push({
                name: this.MAP_PROPERTY_LATEST_COMMAND_ID_KEY,
                type: "string",
                propertytype: "string",
                value: commandId,
            });
        } else {
            property.value = commandId;
        }
    }

    public getLatestCommandId(): string | undefined {
        return this.getMapPropertyByKey(this.MAP_PROPERTY_LATEST_COMMAND_ID_KEY)?.value as string ?? undefined;
    }

    public getMapPropertyByKey(key: string): ITiledMapProperty | undefined {
        return this.map.properties?.find(property => property.name === key);
    }

    public getDefaultTileSize(): number {
        return this.DEFAULT_TILE_SIZE;
    }

    public getGameMapAreas(): GameMapAreas {
        return this.gameMapAreas;
    }

    public getGameMapEntities(): GameMapEntities {
        return this.gameMapEntities;
    }

    // NOTE: Flat layers are deep copied so we cannot operate on them
    public deleteGameObjectFromMapById(id: number, layers: ITiledMapLayer[]): boolean {
        for (const layer of layers) {
            if (layer.type === 'objectgroup') {
                const index = layer.objects.findIndex(object => object.id === id);
                if (index !== -1) {
                    layer.objects.splice(index, 1);
                    return true;
                }
            } else if (layer.type === 'group') {
                return this.deleteGameObjectFromMapById(id, layer.layers);
            }
        }
        return false;
    }

    /**
     * @return lowest possible available id for new object to be created
     */
    public getNextObjectId(): number | undefined {
        return this.map.nextobjectid;
    }

    public incrementNextObjectId(): void {
        if (this.map.nextobjectid !== undefined) {
            this.map.nextobjectid++;
        }
    }
}
