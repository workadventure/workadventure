import { AreaType, GameMapProperties } from "@workadventure/map-editor";
import type { AreaChangeCallback, AreaData, GameMap } from "@workadventure/map-editor";
import type {
    ITiledMap,
    ITiledMapLayer,
    ITiledMapObject,
    ITiledMapProperty,
    ITiledMapTile,
    ITiledMapTileLayer,
} from "@workadventure/tiled-map-type-guard";
import TilemapLayer = Phaser.Tilemaps.TilemapLayer;
import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import { PathTileType } from "../../../Utils/PathfindingManager";
import { MathUtils } from "@workadventure/math-utils";
import { DEPTH_OVERLAY_INDEX } from "../DepthIndexes";
import type { GameScene } from "../GameScene";
import { EntitiesManager } from "./EntitiesManager";
import { Entity } from "../../ECS/Entity";

export type LayerChangeCallback = (
    layersChangedByAction: Array<ITiledMapLayer>,
    allLayersOnNewPosition: Array<ITiledMapLayer>
) => void;

export type PropertyChangeCallback = (
    newValue: string | number | boolean | undefined,
    oldValue: string | number | boolean | undefined,
    allProps: Map<string, string | boolean | number>
) => void;

export class GameMapFrontWrapper {
    private scene: GameScene;
    private gameMap: GameMap;

    private oldKey: number | undefined;
    /**
     * key is the index of the current tile.
     */
    private key: number | undefined;
    /**
     * oldPosition is the previous position of the player.
     */
    private oldPosition: { x: number; y: number } | undefined;
    /**
     * position is the current position of the player.
     */
    private position: { x: number; y: number } | undefined;

    /**
     * Manager for renderable, interactive objects that players can work with.
     */
    private entitiesManager: EntitiesManager;

    public readonly phaserMap: Phaser.Tilemaps.Tilemap;
    public readonly phaserLayers: TilemapLayer[] = [];

    /**
     * Stores information about walls and every object that modifies collision grid on certain tile
     */
    public readonly collisionTilesHistogram: string[][][];

    private perLayerCollisionGridCache: Map<number, (0 | 2 | 1)[][]> = new Map<number, (0 | 2 | 1)[][]>();

    private lastProperties = new Map<string, string | boolean | number>();
    private propertiesChangeCallbacks = new Map<string, Array<PropertyChangeCallback>>();

    private enterLayerCallbacks = Array<LayerChangeCallback>();
    private leaveLayerCallbacks = Array<LayerChangeCallback>();

    /**
     * Firing on map change, containing newest collision grid array
     */
    private mapChangedSubject = new Subject<number[][]>();
    private areaUpdatedSubject = new Subject<AreaData>();

    constructor(
        scene: GameScene,
        gameMap: GameMap,
        phaserMap: Phaser.Tilemaps.Tilemap,
        terrains: Array<Phaser.Tilemaps.Tileset>
    ) {
        this.scene = scene;
        this.gameMap = gameMap;
        this.phaserMap = phaserMap;

        let depth = -2;
        for (const layer of this.gameMap.flatLayers) {
            if (layer.type === "tilelayer") {
                this.phaserLayers.push(
                    phaserMap
                        .createLayer(layer.name, terrains, (layer.x || 0) * 32, (layer.y || 0) * 32)
                        .setDepth(depth)
                        .setScrollFactor(layer.parallaxx ?? 1, layer.parallaxy ?? 1)
                        .setAlpha(layer.opacity)
                        .setVisible(layer.visible)
                        .setSize(layer.width, layer.height)
                );
            }
            if (layer.type === "objectgroup" && layer.name === "floorLayer") {
                depth = DEPTH_OVERLAY_INDEX;
            }
        }

        this.collisionTilesHistogram = [];
        const collisionsLayer = this.phaserLayers.find((phaserLayer) => phaserLayer.layer.name === "collisions");
        for (let y = 0; y < this.phaserMap.height; y += 1) {
            this.collisionTilesHistogram.push([]);
            for (let x = 0; x < this.phaserMap.width; x += 1) {
                if (this.phaserLayers)
                    if (collisionsLayer && collisionsLayer.layer.data[y][x].index !== -1) {
                        this.collisionTilesHistogram[y].push(["predefined"]);
                    } else {
                        this.collisionTilesHistogram[y].push([]);
                    }
            }
        }

        // TODO: Load up entities from JSON
        this.entitiesManager = new EntitiesManager(this.scene, this);
        for (const entityData of this.gameMap.getGameMapEntities().getEntities()) {
            this.entitiesManager.addEntity(entityData);
        }
    }

    public setLayerVisibility(layerName: string, visible: boolean): void {
        const phaserLayer = this.findPhaserLayer(layerName);
        let collisionGrid: number[][] = [];
        if (phaserLayer != undefined) {
            phaserLayer.setVisible(visible);
            phaserLayer.setCollisionByProperty({ collides: true }, visible);
            collisionGrid = this.getCollisionGrid(phaserLayer);
        } else {
            const phaserLayers = this.findPhaserLayers(layerName + "/");
            if (phaserLayers.length === 0) {
                console.warn(
                    'Could not find layer with name that contains "' +
                        layerName +
                        '" when calling WA.hideLayer / WA.showLayer'
                );
                return;
            }
            for (let i = 0; i < phaserLayers.length; i++) {
                phaserLayers[i].setVisible(visible);
                phaserLayers[i].setCollisionByProperty({ collides: true }, visible);
            }
            collisionGrid = this.getCollisionGrid(undefined, false);
        }
        this.mapChangedSubject.next(collisionGrid);
    }

    /**
     *
     * @param x Top left of the starting position in world coordinates
     * @param y Top left of the starting position in world coordinates
     * @param name The key to differentiate between different collisionGrid modificators
     * @param collisionGrid Collisions map representing tiles
     * @returns
     */
    public modifyToCollisionsLayer(x: number, y: number, name: string, collisionGrid: number[][]): void {
        const collisionsLayer = this.phaserLayers.find((phaserLayer) => phaserLayer.layer.name === "collisions");
        const specialZonesTileset = this.phaserMap.tilesets.find((tileset) => tileset.name === "Special_Zones");
        if (!specialZonesTileset || !collisionsLayer) {
            return;
        }
        const coords = collisionsLayer.worldToTileXY(x, y, true);
        for (let y = 0; y < collisionGrid.length; y += 1) {
            for (let x = 0; x < collisionGrid[y].length; x += 1) {
                // add tiles
                if (collisionGrid[y][x] === 1) {
                    const tile = collisionsLayer.putTileAt(specialZonesTileset.firstgid, coords.x + x, coords.y + y);
                    this.collisionTilesHistogram[coords.y + y][coords.x + x].push(name);
                    tile.properties["collides"] = true;
                    continue;
                }
                // remove tiles
                if (collisionGrid[y][x] === -1) {
                    const tagNameIndex = this.collisionTilesHistogram[coords.y + y][coords.x + x].findIndex(
                        (tagName) => tagName === name
                    );
                    if (tagNameIndex !== -1) {
                        this.collisionTilesHistogram[coords.y + y][coords.x + x].splice(tagNameIndex, 1);
                        if (this.collisionTilesHistogram[coords.y + y][coords.x + x].length === 0) {
                            collisionsLayer.removeTileAt(coords.x + x, coords.y + y, false);
                        }
                    }
                }
            }
        }
        collisionsLayer.setCollisionByProperty({ collides: true });
        this.mapChangedSubject.next(this.getCollisionGrid(collisionsLayer, false));
    }

    public isSpaceAvailable(xPos: number, yPos: number, size = 1): boolean {
        // if (xPos < 0 || xPos > this.map.width || yPos < 0 || yPos > this.getMapHeightPixels()) {
        //     return false;
        // }
        // const xIndex = Math.floor(xPos / GlobalConfig.TILE_SIZE);
        // const yIndex = Math.floor(yPos / GlobalConfig.TILE_SIZE);
        // if (yIndex >= this.height || yIndex < 0 || xIndex >= this.width || xIndex < 0) {
        //     return false;
        // }
        // for (let x = xIndex; x < xIndex + size; x += 1) {
        //     if (x >= this.width) {
        //         return false;
        //     }
        //     for (let y = yIndex; y < yIndex + size; y += 1) {
        //         if (y >= this.height) {
        //             return false;
        //         }
        //         if (this.collisionGrid[y][x] === 1) {
        //             return false;
        //         }
        //     }
        // }
        // return true;
    }

    public getPropertiesForIndex(index: number): Array<ITiledMapProperty> {
        return this.gameMap.getPropertiesForIndex(index);
    }

    public getTileInformationFromTileset(tilesetName: string, tileIndex: number): ITiledMapTile | undefined {
        return this.gameMap.getTileInformationFromTileset(tilesetName, tileIndex);
    }

    public getCollisionGrid(modifiedLayer?: TilemapLayer, useCache = true): number[][] {
        const map = this.gameMap.getMap();
        // initialize collision grid to write on
        if (map.height === undefined || map.width === undefined) {
            return [];
        }
        const grid: number[][] = Array.from(Array(map.height), (_) => Array(map.width).fill(PathTileType.Walkable));
        if (modifiedLayer) {
            // recalculate cache for certain layer if needed
            this.perLayerCollisionGridCache.set(modifiedLayer.layerIndex, this.getLayerCollisionGrid(modifiedLayer));
        }
        // go through all tilemap layers on map. Maintain order
        for (const layer of this.phaserLayers) {
            if (!layer.visible) {
                continue;
            }
            if (!useCache) {
                this.perLayerCollisionGridCache.set(layer.layerIndex, this.getLayerCollisionGrid(layer));
            }
            const cachedLayer = this.perLayerCollisionGridCache.get(layer.layerIndex);
            if (!cachedLayer) {
                // no cache, calculate collision grid for this layer
                this.perLayerCollisionGridCache.set(layer.layerIndex, this.getLayerCollisionGrid(layer));
            } else {
                for (let y = 0; y < map.height; y += 1) {
                    for (let x = 0; x < map.width; x += 1) {
                        // currently no case where we can make tile non-collidable with collidable object beneath, skip position
                        if (grid[y][x] === PathTileType.Exit && cachedLayer[y][x] === PathTileType.Collider) {
                            grid[y][x] = cachedLayer[y][x];
                            continue;
                        }
                        if (grid[y][x] !== PathTileType.Walkable) {
                            continue;
                        }
                        grid[y][x] = cachedLayer[y][x];
                    }
                }
            }
        }
        return grid;
    }

    public getTileDimensions(): { width: number; height: number } {
        return this.gameMap.getTileDimensions();
    }

    public getTileIndexAt(x: number, y: number): { x: number; y: number } {
        return this.gameMap.getTileIndexAt(x, y);
    }

    /**
     * Sets the position of the current player (in pixels)
     * This will trigger events if properties are changing.
     */
    public setPosition(x: number, y: number) {
        const map = this.getMap();
        if (!map.width || !map.height) {
            return;
        }
        this.oldPosition = this.position;
        this.position = { x, y };
        const areasChanged = this.gameMap.getGameMapAreas().triggerAreasChange(this.oldPosition, this.position);
        if (areasChanged) {
            this.triggerAllProperties();
        }

        this.oldKey = this.key;

        const xMap = Math.floor(x / (map.tilewidth ?? this.gameMap.getDefaultTileSize()));
        const yMap = Math.floor(y / (map.tileheight ?? this.gameMap.getDefaultTileSize()));
        const key = xMap + yMap * map.width;

        if (key === this.key) {
            return;
        }

        this.key = key;

        this.triggerAllProperties();
        this.triggerLayersChange();
    }

    public getCurrentProperties(): Map<string, string | boolean | number> {
        return this.lastProperties;
    }

    public clearCurrentProperties(): void {
        return this.lastProperties.clear();
    }

    public getMap(): ITiledMap {
        return this.gameMap.getMap();
    }

    /**
     * Registers a callback called when the user moves to a tile where the property propName is different from the last tile the user was on.
     */
    public onPropertyChange(propName: string, callback: PropertyChangeCallback) {
        let callbacksArray = this.propertiesChangeCallbacks.get(propName);
        if (callbacksArray === undefined) {
            callbacksArray = new Array<PropertyChangeCallback>();
            this.propertiesChangeCallbacks.set(propName, callbacksArray);
        }
        callbacksArray.push(callback);
    }

    /**
     * Registers a callback called when the user moves inside another layer.
     */
    public onEnterLayer(callback: LayerChangeCallback) {
        this.enterLayerCallbacks.push(callback);
    }

    /**
     * Registers a callback called when the user moves outside another layer.
     */
    public onLeaveLayer(callback: LayerChangeCallback) {
        this.leaveLayerCallbacks.push(callback);
    }

    public findLayer(layerName: string): ITiledMapLayer | undefined {
        return this.gameMap.findLayer(layerName);
    }

    public findObject(objectName: string, objectClass?: string): ITiledMapObject | undefined {
        return this.gameMap.findObject(objectName, objectClass);
    }

    public findPhaserLayer(layerName: string): TilemapLayer | undefined {
        return this.phaserLayers.find((layer) => layer.layer.name === layerName);
    }

    public findPhaserLayers(groupName: string): TilemapLayer[] {
        return this.phaserLayers.filter((l) => l.layer.name.includes(groupName));
    }

    public addTerrain(terrain: Phaser.Tilemaps.Tileset): void {
        for (const phaserLayer of this.phaserLayers) {
            phaserLayer.tileset.push(terrain);
        }
    }

    public putTile(tile: string | number | null, x: number, y: number, layer: string): void {
        const phaserLayer = this.findPhaserLayer(layer);
        if (phaserLayer) {
            if (tile === null) {
                phaserLayer.putTileAt(-1, x, y);
            } else {
                const tileIndex = this.gameMap.getIndexForTileType(tile);
                if (tileIndex === undefined) {
                    console.error("The tile '" + tile + "' that you want to place doesn't exist.");
                    return;
                }
                this.gameMap.putTileInFlatLayer(tileIndex, x, y, layer);
                const phaserTile = phaserLayer.putTileAt(tileIndex, x, y);
                for (const property of this.gameMap.getTileProperty(tileIndex)) {
                    if (property.name === GameMapProperties.COLLIDES && property.value) {
                        phaserTile.setCollision(true);
                    }
                }
            }
            this.mapChangedSubject.next(this.getCollisionGrid(phaserLayer));
        } else {
            console.error("The layer '" + layer + "' does not exist (or is not a tilelaye).");
        }
    }

    public setLayerProperty(
        layerName: string,
        propertyName: string,
        propertyValue: string | number | undefined | boolean
    ) {
        const layer = this.findLayer(layerName);
        if (layer === undefined) {
            console.warn('Could not find layer "' + layerName + '" when calling setProperty');
            return;
        }
        this.gameMap.setTiledObjectProperty(layer, propertyName, propertyValue);
        this.triggerAllProperties();
        this.triggerLayersChange();
    }

    /**
     * Trigger all the callbacks (used when exiting a map)
     */
    public triggerExitCallbacks(): void {
        const emptyProps = new Map<string, string | boolean | number>();
        for (const [oldPropName, oldPropValue] of this.lastProperties.entries()) {
            // We found a property that disappeared
            this.trigger(oldPropName, oldPropValue, undefined, emptyProps);
        }
    }

    public getRandomPositionFromLayer(layerName: string): { x: number; y: number } {
        const layer = this.findLayer(layerName) as ITiledMapTileLayer;
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
        throw new Error("No possible position found");
    }

    public getTiledObjectProperty(
        object: { properties?: ITiledMapProperty[] },
        propertyName: string
    ): string | boolean | number | undefined {
        return this.gameMap.getTiledObjectProperty(object, propertyName);
    }

    public getObjectWithName(name: string): ITiledMapObject | undefined {
        return this.gameMap.getObjectWithName(name);
    }

    /**
     * Registers a callback called when the user moves inside another area.
     */
    public onEnterArea(callback: AreaChangeCallback) {
        this.gameMap.onEnterArea(callback);
    }

    /**
     * Registers a callback called when the user moves outside another area.
     */
    public onLeaveArea(callback: AreaChangeCallback) {
        this.gameMap.getGameMapAreas().onLeaveArea(callback);
    }

    public setAreaProperty(
        areaName: string,
        areaType: AreaType,
        propertyName: string,
        propertyValue: string | number | boolean | undefined
    ): void {
        const area = this.getAreaByName(areaName, areaType);
        if (area === undefined) {
            console.warn('Could not find area "' + areaName + '" when calling setProperty');
            return;
        }
        this.gameMap.setAreaProperty(area, propertyName, propertyValue);
        this.triggerAllProperties();
        this.gameMap.getGameMapAreas().triggerAreasChange(this.oldPosition, this.position);
    }

    public mapAreaToTiledObject(area: AreaData): ITiledMapObject {
        return this.gameMap.getGameMapAreas().mapAreaDataToTiledObject(area);
    }

    public getAreas(areaType: AreaType): AreaData[] {
        return this.gameMap.getGameMapAreas().getAreas(areaType);
    }

    public addArea(area: AreaData, type: AreaType): void {
        this.gameMap.getGameMapAreas().addArea(area, type, this.position);
    }

    public triggerSpecificAreaOnEnter(area: AreaData): void {
        this.gameMap.getGameMapAreas().triggerSpecificAreaOnEnter(area);
    }

    public triggerSpecificAreaOnLeave(area: AreaData): void {
        this.gameMap.getGameMapAreas().triggerSpecificAreaOnLeave(area);
    }

    public getAreaByName(name: string, type: AreaType): AreaData | undefined {
        return this.gameMap.getGameMapAreas().getAreaByName(name, type);
    }

    public getArea(id: number, type: AreaType): AreaData | undefined {
        return this.gameMap.getGameMapAreas().getArea(id, type);
    }

    public updateAreaByName(name: string, type: AreaType, config: Partial<AreaData>): void {
        const gameMapAreas = this.gameMap.getGameMapAreas();
        const area = gameMapAreas.updateAreaByName(name, type, config);
        if (this.position && area && gameMapAreas.isPlayerInsideAreaByName(name, type, this.position)) {
            gameMapAreas.triggerSpecificAreaOnEnter(area);
        }
        this.areaUpdatedSubject.next(gameMapAreas.getAreaByName(name, AreaType.Static));
    }

    public updateAreaById(id: number, type: AreaType, config: Partial<AreaData>): void {
        const gameMapAreas = this.gameMap.getGameMapAreas();
        const area = gameMapAreas.updateAreaById(id, type, config);
        if (this.position && area && gameMapAreas.isPlayerInsideArea(id, type, this.position)) {
            this.triggerSpecificAreaOnEnter(area);
        }
        this.areaUpdatedSubject.next(gameMapAreas.getArea(id, AreaType.Static));
    }

    public deleteAreaByName(name: string, type: AreaType): void {
        this.gameMap.getGameMapAreas().deleteAreaByName(name, type, this.position);
    }

    public deleteAreaById(id: number, type: AreaType): void {
        this.gameMap.getGameMapAreas().deleteAreaById(id, type, this.position);
    }

    public isPlayerInsideArea(id: number, type: AreaType): boolean {
        if (!this.position) {
            return false;
        }
        return this.gameMap.getGameMapAreas().isPlayerInsideArea(id, type, this.position);
    }

    public isPlayerInsideAreaByName(name: string, type: AreaType): boolean {
        if (!this.position) {
            return false;
        }
        return this.gameMap.getGameMapAreas().isPlayerInsideAreaByName(name, type, this.position);
    }

    public getMapChangedObservable(): Observable<number[][]> {
        return this.mapChangedSubject.asObservable();
    }

    public getAreaUpdatedObservable(): Observable<AreaData> {
        return this.areaUpdatedSubject.asObservable();
    }

    public getFlatLayers(): ITiledMapLayer[] {
        return this.gameMap.flatLayers;
    }

    public getExitUrls(): Array<string> {
        return this.gameMap.exitUrls;
    }

    public hasStartTile(): boolean {
        return this.gameMap.hasStartTile;
    }

    public getGameMap(): GameMap {
        return this.gameMap;
    }

    public getEntitiesManager(): EntitiesManager {
        return this.entitiesManager;
    }

    public getEntities(): Entity[] {
        return this.entitiesManager.getEntities();
    }

    public handleEntityActionTrigger(): void {
        this.triggerAllProperties();
    }

    private triggerAllProperties(): void {
        const newProps = this.getProperties(this.key ?? 0);
        const oldProps = this.lastProperties;
        this.lastProperties = newProps;

        // Let's compare the 2 maps:
        // First new properties vs oldProperties
        for (const [newPropName, newPropValue] of newProps.entries()) {
            const oldPropValue = oldProps.get(newPropName);
            if (oldPropValue !== newPropValue) {
                this.trigger(newPropName, oldPropValue, newPropValue, newProps);
            }
        }

        for (const [oldPropName, oldPropValue] of oldProps.entries()) {
            if (!newProps.has(oldPropName)) {
                // We found a property that disappeared
                this.trigger(oldPropName, oldPropValue, undefined, newProps);
            }
        }
    }

    private getLayerCollisionGrid(layer: TilemapLayer): (1 | 2 | 0)[][] {
        let isExitLayer = false;
        for (const property of layer.layer.properties as { [key: string]: string | number | boolean }[]) {
            if (property.name && property.name === "exitUrl") {
                isExitLayer = true;
                break;
            }
        }
        return layer.layer.data.map((row) =>
            row.map((tile) =>
                tile.properties?.[GameMapProperties.COLLIDES]
                    ? 1
                    : isExitLayer ||
                      tile.properties[GameMapProperties.EXIT_URL] ||
                      tile.properties[GameMapProperties.EXIT_SCENE_URL]
                    ? 2
                    : 0
            )
        );
    }

    private getProperties(key: number): Map<string, string | boolean | number> {
        const properties = this.position
            ? this.gameMap.getGameMapAreas().getProperties(this.position)
            : new Map<string, string | boolean | number>();

        if (this.entitiesManager) {
            for (const property of this.entitiesManager.getProperties()) {
                properties.set(property[0], property[1]);
            }
        }

        for (const layer of this.getFlatLayers()) {
            if (layer.type !== "tilelayer") {
                continue;
            }

            let tileIndex: number | undefined = undefined;
            if (layer.data) {
                const tiles = layer.data as number[];
                if (tiles[key] == 0) {
                    continue;
                }
                tileIndex = tiles[key];
            }

            // There is a tile in this layer, let's embed the properties
            if (layer.properties !== undefined) {
                for (const layerProperty of layer.properties) {
                    if (layerProperty.value === undefined) {
                        continue;
                    }
                    properties.set(layerProperty.name, layerProperty.value as string | number | boolean);
                }
            }

            if (tileIndex) {
                this.gameMap.getTileProperty(tileIndex).forEach((property) => {
                    if (property.value) {
                        properties.set(property.name, property.value as string | number | boolean);
                    } else if (properties.has(property.name)) {
                        properties.delete(property.name);
                    }
                });
            }
        }

        return properties;
    }

    private trigger(
        propName: string,
        oldValue: string | number | boolean | undefined,
        newValue: string | number | boolean | undefined,
        allProps: Map<string, string | boolean | number>
    ) {
        const callbacksArray = this.propertiesChangeCallbacks.get(propName);
        if (callbacksArray !== undefined) {
            for (const callback of callbacksArray) {
                callback(newValue, oldValue, allProps);
            }
        }
    }

    private triggerLayersChange(): void {
        const layersByOldKey = this.oldKey ? this.gameMap.getLayersByKey(this.oldKey) : [];
        const layersByNewKey = this.key ? this.gameMap.getLayersByKey(this.key) : [];

        const enterLayers = new Set(layersByNewKey);
        const leaveLayers = new Set(layersByOldKey);

        enterLayers.forEach((layer) => {
            if (leaveLayers.has(layer)) {
                leaveLayers.delete(layer);
                enterLayers.delete(layer);
            }
        });

        if (enterLayers.size > 0) {
            const layerArray = Array.from(enterLayers);
            for (const callback of this.enterLayerCallbacks) {
                callback(layerArray, layersByNewKey);
            }
        }

        if (leaveLayers.size > 0) {
            const layerArray = Array.from(leaveLayers);
            for (const callback of this.leaveLayerCallbacks) {
                callback(layerArray, layersByNewKey);
            }
        }
    }
}
