import type { AreaChangeCallback, AreaData, AtLeast, GameMap } from "@workadventure/map-editor";
import { AreaCoordinates, AreaDataProperties, AreaUpdateCallback, GameMapProperties } from "@workadventure/map-editor";
import { MathUtils } from "@workadventure/math-utils";
import type {
    ITiledMap,
    ITiledMapLayer,
    ITiledMapObject,
    ITiledMapProperty,
    ITiledMapTileLayer,
    Json,
} from "@workadventure/tiled-map-type-guard";
import type { Observable } from "rxjs";
import { Subject } from "rxjs";
import { Deferred } from "ts-deferred";
import { PathTileType } from "../../../Utils/PathfindingManager";
import { Entity } from "../../ECS/Entity";
import { DEPTH_OVERLAY_INDEX } from "../DepthIndexes";
import { ITiledPlace } from "../GameMapPropertiesListener";
import type { GameScene } from "../GameScene";
import { EntitiesManager } from "./EntitiesManager";
import { AreasManager } from "./AreasManager";
import TilemapLayer = Phaser.Tilemaps.TilemapLayer;

export type DynamicArea = {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    properties: { [key: string]: unknown };
};

export type LayerChangeCallback = (
    layersChangedByAction: Array<ITiledMapLayer>,
    allLayersOnNewPosition: Array<ITiledMapLayer>
) => void;

export type TiledAreaChangeCallback = (
    areasChangedByAction: Array<ITiledMapObject>,
    allAreasOnNewPosition: Array<ITiledMapObject>
) => void;

export type DynamicAreaChangeCallback = (
    areasChangedByAction: Array<DynamicArea>,
    allAreasOnNewPosition: Array<DynamicArea>
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
     * Areas that we can do CRUD operations on via scripting API
     */
    public readonly dynamicAreas: Map<string, DynamicArea> = new Map<string, DynamicArea>();

    public collisionGrid: number[][];
    /**
     * A layer containing collide tiles mapping the collision zones of entities put with the map editor
     */
    private entitiesCollisionLayer: Phaser.Tilemaps.TilemapLayer;
    /**
     * A layer containing collide tiles mapping the collision zones of restricted areas put with the map editor
     */
    private areasCollisionLayer: Phaser.Tilemaps.TilemapLayer;

    private perLayerCollisionGridCache: Map<number, (0 | 1 | 2 | 3)[][]> = new Map<number, (0 | 1 | 2 | 3)[][]>();

    private lastProperties = new Map<string, string | boolean | number>();
    private propertiesChangeCallbacks = new Map<string, Array<PropertyChangeCallback>>();

    private enterLayerCallbacks = Array<LayerChangeCallback>();
    private leaveLayerCallbacks = Array<LayerChangeCallback>();

    private enterTiledAreaCallbacks = Array<TiledAreaChangeCallback>();
    private leaveTiledAreaCallbacks = Array<TiledAreaChangeCallback>();

    private enterDynamicAreaCallbacks = Array<DynamicAreaChangeCallback>();
    private leaveDynamicAreaCallbacks = Array<DynamicAreaChangeCallback>();

    public areasManager: AreasManager | undefined;

    /**
     * Firing on map change, containing newest collision grid array
     */
    private mapChangedSubject = new Subject<number[][]>();

    /**
     * HACK: We need to make sure we are using an existing Tile index in order to place it inside entitieCollisionLayer.
     * This is needed since 3.60.0. For some reason, index of -1 value is no longer working properly with default collision system
     * for tiles. To make it work as intended, we also need to make entitiesCollisionLayer invisible.
     */
    private readonly existingTileIndex;

    public readonly initializedPromise = new Deferred<void>();

    constructor(
        scene: GameScene,
        gameMap: GameMap,
        phaserMap: Phaser.Tilemaps.Tilemap,
        terrains: Array<Phaser.Tilemaps.Tileset>
    ) {
        this.scene = scene;
        this.gameMap = gameMap;
        this.phaserMap = phaserMap;

        this.existingTileIndex = terrains.length > 0 ? terrains[0].firstgid : -1;

        this.entitiesManager = new EntitiesManager(this.scene, this);

        this.updateCollisionGrid(undefined, false);

        let depth = -2;
        for (const layer of this.gameMap.flatLayers) {
            if (layer.type === "tilelayer") {
                const phaserLayer = phaserMap.createLayer(
                    layer.name,
                    terrains,
                    (layer.x || 0) * 32,
                    (layer.y || 0) * 32
                );
                if (phaserLayer) {
                    this.phaserLayers.push(
                        phaserLayer
                            .setDepth(depth)
                            .setScrollFactor(layer.parallaxx ?? 1, layer.parallaxy ?? 1)
                            .setAlpha(layer.opacity)
                            .setVisible(layer.visible)
                            .setSize(layer.width, layer.height)
                    );
                }
            }
            if (layer.type === "objectgroup" && layer.name === "floorLayer") {
                depth = DEPTH_OVERLAY_INDEX;
            }
        }

        let nbUnnamedTileArea = 0;

        // NOTE: We leave "zone" for legacy reasons
        this.gameMap.tiledObjects
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
                if (this.dynamicAreas.get(tiledArea.name)) {
                    console.warn("There are several '" + tiledArea.name + "' areas existing in your Tiled map.");
                    tiledArea.name = "unnamed_tiled_area_" + nbUnnamedTileArea;
                    nbUnnamedTileArea++;
                }
                this.dynamicAreas.set(tiledArea.name, {
                    name: tiledArea.name,
                    width: tiledArea.width,
                    height: tiledArea.height,
                    x: tiledArea.x,
                    y: tiledArea.y,
                    properties: this.mapTiledPropertiesToDynamicAreaProperties(tiledArea.properties ?? []),
                });
            });

        this.collisionGrid = [];
        // NOTE: We cannot really proceed without it
        const phaserBlankCollisionsLayer = phaserMap.createBlankLayer("__entitiesCollisionLayer", terrains);
        if (!phaserBlankCollisionsLayer) {
            throw new Error("Could not create entities collision layer");
        }
        this.entitiesCollisionLayer = phaserBlankCollisionsLayer;
        this.entitiesCollisionLayer.setDepth(-2).setCollisionByProperty({ collides: true }).setVisible(false);

        this.phaserLayers.push(this.entitiesCollisionLayer);

        const phaserBlankCollisionsLayer2 = phaserMap.createBlankLayer("__areasCollisionLayer", terrains);
        if (!phaserBlankCollisionsLayer2) {
            throw new Error("Could not create areas collision layer");
        }
        this.areasCollisionLayer = phaserBlankCollisionsLayer2;
        this.areasCollisionLayer.setDepth(-2).setCollisionByProperty({ collides: true }).setVisible(false);

        this.phaserLayers.push(this.areasCollisionLayer);

        this.updateCollisionGrid(undefined, false);
    }

    public initialize(): Promise<void> {
        // Spawn first entities from WAM file on the map
        const addEntityPromises: Promise<Entity>[] = [];
        for (const [entityId, entityData] of Object.entries(this.gameMap.getGameMapEntities()?.getEntities() ?? {})) {
            addEntityPromises.push(this.entitiesManager.addEntity(entityId, entityData, undefined, undefined, false));
            // We need to AWAIT for all entities to be created.
            // OTHERWISE, delete commands might pass FIRST!
        }

        return Promise.allSettled(addEntityPromises).then((promiseResults) => {
            promiseResults.forEach((result) => {
                if (result.status === "rejected") {
                    console.error(result.reason);
                }
            });
            this.updateCollisionGrid(this.entitiesCollisionLayer, false);
            this.initializedPromise.resolve();
        });
    }

    public recomputeEntitiesCollisionGrid() {
        const entities = this.entitiesManager.getEntities();

        this.entitiesCollisionLayer.fill(-1);

        for (const entity of entities.values()) {
            const entityCollisionGrid = entity.getCollisionGrid();
            if (entityCollisionGrid === undefined) {
                continue;
            }
            this.modifyToCollisionsLayer(entity.x, entity.y, entity.name, entityCollisionGrid, false);
        }

        this.updateCollisionGrid(this.entitiesCollisionLayer, false);
    }

    public recomputeAreasCollisionGrid() {
        //this.areasCollisionLayer.fill(-1);
        for (let y = 0; y < (this.getMap()?.height ?? 0); y++) {
            for (let x = 0; x < (this.getMap()?.width ?? 0); x++) {
                this.areasCollisionLayer.removeTileAt(x, y, false);
            }
        }

        if (this.areasManager) {
            for (const area of this.areasManager.getCollidingAreas()) {
                this.registerCollisionArea(area);
            }
        }

        this.updateCollisionGrid(this.areasCollisionLayer, false);
    }

    public initializeAreaManager(userConnectedTags: string[], userCanEdit: boolean) {
        const gameMapAreas = this.getGameMap().getGameMapAreas();
        // If gameMapAreas is undefined, we are on a public map
        if (gameMapAreas !== undefined) {
            this.areasManager = new AreasManager(this.scene, gameMapAreas, userConnectedTags, userCanEdit);
            gameMapAreas.triggerAreasChange(undefined, this.position);
        }
        // Once we have the tags, we can compute the colliding layer again
        this.recomputeAreasCollisionGrid();
    }

    public setLayerVisibility(layerName: string, visible: boolean): void {
        const phaserLayer = this.findPhaserLayer(layerName);
        if (phaserLayer != undefined) {
            phaserLayer.setVisible(visible);
            phaserLayer.setCollisionByProperty({ collides: true }, visible);
            this.updateCollisionGrid(phaserLayer);
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
            this.updateCollisionGrid(undefined, false);
        }
    }

    /**
     *
     * @param x Top left of the starting position in world coordinates
     * @param y Top left of the starting position in world coordinates
     * @param name The key to differentiate between different collisionGrid modificators
     * @param collisionGrid Collisions map representing tiles
     * @returns
     */
    public modifyToCollisionsLayer(
        x: number,
        y: number,
        name: string,
        collisionGrid: number[][],
        withGridUpdate = true
    ): void {
        const coords = this.entitiesCollisionLayer.worldToTileXY(x, y, true);
        for (let y = 0; y < collisionGrid.length; y += 1) {
            for (let x = 0; x < collisionGrid[y].length; x += 1) {
                // add tiles
                if (collisionGrid[y][x] === 1) {
                    const tile = this.entitiesCollisionLayer.putTileAt(
                        this.existingTileIndex,
                        coords.x + x,
                        coords.y + y
                    );
                    tile.properties["collides"] = true;
                    continue;
                }
                // remove tiles
                if (collisionGrid[y][x] === -1) {
                    this.entitiesCollisionLayer.removeTileAt(coords.x + x, coords.y + y, false);
                }
            }
        }
        this.entitiesCollisionLayer.setCollisionByProperty({ collides: true });
        if (withGridUpdate) {
            this.updateCollisionGrid(this.entitiesCollisionLayer, false);
        }
    }

    private registerCollisionArea(area: AreaData): void {
        const tileWidth = this.getMap().tilewidth ?? 32;
        const tileHeight = this.getMap().tileheight ?? 32;

        const xStart = Math.floor(area.x / tileWidth);
        const yStart = Math.floor(area.y / tileHeight);

        const xEnd = Math.ceil((area.x + area.width) / tileWidth);
        const yEnd = Math.ceil((area.y + area.height) / tileHeight);

        for (let y = yStart; y < yEnd; y += 1) {
            for (let x = xStart; x < xEnd; x += 1) {
                const tile = this.areasCollisionLayer.putTileAt(this.existingTileIndex, x, y);
                tile.properties["collides"] = true;
            }
        }
    }

    public getPropertiesForIndex(index: number): Array<ITiledMapProperty> {
        return this.gameMap.getPropertiesForIndex(index);
    }

    public getCollisionGrid(): number[][] {
        return this.collisionGrid;
    }

    private updateCollisionGrid(modifiedLayer?: TilemapLayer, useCache = true): void {
        const map = this.gameMap.getMap();
        // initialize collision grid to write on
        if (map.height === undefined || map.width === undefined) {
            this.collisionGrid = [];
            return;
        }
        const grid: number[][] = Array.from(Array(map.height), (_) => Array(map.width).fill(PathTileType.Walkable));
        if (modifiedLayer) {
            // recalculate cache for certain layer if needed
            this.perLayerCollisionGridCache.set(modifiedLayer.layerIndex, this.getLayerCollisionGrid(modifiedLayer));
        }
        // go through all tilemap layers on map. Maintain order
        for (const layer of this.phaserLayers) {
            if (!layer.visible && layer !== this.entitiesCollisionLayer && layer !== this.areasCollisionLayer) {
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
                        if (grid[y][x] === PathTileType.Start && cachedLayer[y][x] === PathTileType.Collider) {
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
        this.collisionGrid = grid;
        this.mapChangedSubject.next(this.collisionGrid);
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
        const areasChanged = this.gameMap.getGameMapAreas()?.triggerAreasChange(this.oldPosition, this.position);
        const dynamicAreasChanged = this.triggerDynamicAreasChange(this.oldPosition, this.position);
        if (areasChanged || dynamicAreasChanged) {
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

    /**
     * Registers a callback called when the user moves inside another Tiled Area.
     */
    public onEnterTiledArea(callback: TiledAreaChangeCallback) {
        this.enterTiledAreaCallbacks.push(callback);
    }

    /**
     * Registers a callback called when the user moves outside another Tiled Area.
     */
    public onLeaveTiledArea(callback: TiledAreaChangeCallback) {
        this.leaveTiledAreaCallbacks.push(callback);
    }

    /**
     * Registers a callback called when the user moves inside another Dynamic Area.
     */
    public onEnterDynamicArea(callback: DynamicAreaChangeCallback) {
        this.enterDynamicAreaCallbacks.push(callback);
    }

    /**
     * Registers a callback called when the user moves outside another Dynamic Area.
     */
    public onLeaveDynamicArea(callback: DynamicAreaChangeCallback) {
        this.leaveDynamicAreaCallbacks.push(callback);
    }

    /**
     * Registers a callback called when the user moves inside another area.
     */
    public onEnterArea(callback: AreaChangeCallback) {
        this.gameMap.onEnterArea(callback);
    }

    /**
     * Registers a callback called when an area has been updated.
     */
    public onUpdateArea(callback: AreaUpdateCallback) {
        this.gameMap.onUpdateArea(callback);
    }

    /**
     * Registers a callback called when the user moves outside another area.
     */
    public onLeaveArea(callback: AreaChangeCallback) {
        this.gameMap.getGameMapAreas()?.onLeaveArea(callback);
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
            this.updateCollisionGrid(phaserLayer);
        } else {
            console.error("The layer '" + layer + "' does not exist (or is not a tilelaye).");
        }
    }

    public canEntityBePlacedOnMap(
        topLeftPos: { x: number; y: number },
        width: number,
        height: number,
        collisionGrid?: number[][],
        oldTopLeftPos?: { x: number; y: number },
        ignoreCollisionGrid?: boolean
    ): boolean {
        const canEntityBePlaced = this.canEntityBePlaced(
            topLeftPos,
            width,
            height,
            collisionGrid,
            oldTopLeftPos,
            ignoreCollisionGrid
        );

        const entityCenterCoordinates = {
            x: Math.ceil(topLeftPos.x + width / 2),
            y: Math.ceil(topLeftPos.y + height / 2),
        };

        return (
            canEntityBePlaced &&
            this.scene.getEntityPermissions().canEdit(entityCenterCoordinates, width, height, !collisionGrid)
        );
    }

    private canEntityBePlaced(
        topLeftPos: { x: number; y: number },
        width: number,
        height: number,
        collisionGrid?: number[][],
        oldTopLeftPos?: { x: number; y: number },
        ignoreCollisionGrid?: boolean
    ): boolean {
        const isOutOfBounds = this.scene
            .getGameMapFrontWrapper()
            .isOutOfMapBounds(topLeftPos.x, topLeftPos.y, width, height);
        if (isOutOfBounds) {
            return false;
        }

        // no collision grid means we can place it anywhere on the map
        if (!collisionGrid) {
            return true;
        }

        // prevent entity's old position from blocking it when repositioning
        const positionsToIgnore: Map<string, number> = new Map<string, number>();
        const tileDim = this.scene.getGameMapFrontWrapper().getTileDimensions();
        if (oldTopLeftPos) {
            for (let y = 0; y < collisionGrid.length; y += 1) {
                for (let x = 0; x < collisionGrid[y].length; x += 1) {
                    if (collisionGrid[y][x] === 1) {
                        const xIndex = Math.floor((oldTopLeftPos.x + x * tileDim.width) / tileDim.width);
                        const yIndex = Math.floor((oldTopLeftPos.y + y * tileDim.height) / tileDim.height);
                        positionsToIgnore.set(`x:${xIndex}y:${yIndex}`, 1);
                    }
                }
            }
        }
        for (let y = 0; y < collisionGrid.length; y += 1) {
            for (let x = 0; x < collisionGrid[y].length; x += 1) {
                // this tile in collisionGrid is non-collidible. We can skip calculations for it
                if (collisionGrid[y][x] === 0) {
                    continue;
                }
                const xIndex = Math.floor((topLeftPos.x + x * tileDim.width) / tileDim.width);
                const yIndex = Math.floor((topLeftPos.y + y * tileDim.height) / tileDim.height);
                // current position is being blocked by entity's old position. We can ignore that
                // NOTE: Is it possible for position to be blocked by 2 different things?
                if (positionsToIgnore.has(`x:${xIndex}y:${yIndex}`)) {
                    continue;
                }
                if (
                    !this.scene
                        .getGameMapFrontWrapper()
                        .isSpaceAvailable(
                            topLeftPos.x + x * tileDim.width,
                            topLeftPos.y + y * tileDim.height,
                            ignoreCollisionGrid
                        )
                ) {
                    return false;
                }
            }
        }

        return true;
    }

    public isSpaceAvailable(topLeftX: number, topLeftY: number, ignoreCollisionGrid?: boolean): boolean {
        if (this.collisionGrid.length === 0) {
            return false;
        }
        if (
            this.isOutOfMapBounds(topLeftX, topLeftY, this.getTileDimensions().width, this.getTileDimensions().height)
        ) {
            return false;
        }
        const playersPositions = [
            ...Array.from(this.scene.getRemotePlayersRepository().getPlayers().values()).map(
                (player) => player.position
            ),
            this.scene.CurrentPlayer.getPosition(),
        ];

        // check if position is not occupied by a WOKA
        for (const position of playersPositions) {
            if (
                MathUtils.isOverlappingWithRectangle(position, {
                    x: topLeftX,
                    y: topLeftY,
                    width: this.getTileDimensions().width,
                    height: this.getTileDimensions().height,
                })
            ) {
                return false;
            }
        }

        if (ignoreCollisionGrid) {
            return true;
        }

        // Check if position is not colliding
        const height = this.collisionGrid.length;
        const width = this.collisionGrid[0].length;
        const xIndex = Math.floor(topLeftX / this.getTileDimensions().width);
        const yIndex = Math.floor(topLeftY / this.getTileDimensions().height);
        if (yIndex >= height || yIndex < 0 || xIndex >= width || xIndex < 0) {
            return false;
        }
        if (this.collisionGrid[yIndex][xIndex] !== 0) {
            return false;
        }
        return true;
    }

    public isOutOfMapBounds(topLeftX: number, topLeftY: number, width = 0, height = 0): boolean {
        const mapWidth = this.collisionGrid[0].length * this.getTileDimensions().width;
        const mapHeight = this.collisionGrid.length * this.getTileDimensions().height;
        if (topLeftX < 0 || topLeftX + width > mapWidth || topLeftY < 0 || topLeftY + height > mapHeight) {
            return true;
        }
        return false;
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
    ): Json | undefined {
        return this.gameMap.getTiledObjectProperty(object, propertyName);
    }

    public getObjectWithName(name: string): ITiledMapObject | undefined {
        return this.gameMap.getObjectWithName(name);
    }

    public setDynamicAreaProperty(areaName: string, propertyName: string, propertyValue: unknown): void {
        const area = this.dynamicAreas.get(areaName);
        if (area === undefined) {
            console.warn('Could not find dynamic area "' + areaName + '" when calling setProperty');
            return;
        }
        area.properties[propertyName] = propertyValue;
        this.triggerAllProperties();
        this.triggerDynamicAreasChange(this.oldPosition, this.position);
    }

    public getAreas(): Map<string, AreaData> | undefined {
        return this.gameMap.getGameMapAreas()?.getAreas();
    }

    public addArea(area: AreaData): void {
        this.gameMap.getGameMapAreas()?.addArea(area, true, this.position);
    }

    public addDynamicArea(area: DynamicArea): boolean {
        if (this.dynamicAreas.has(area.name)) {
            return false;
        }
        this.dynamicAreas.set(area.name, area);

        // Trigger properties (in case the player is inside the new area)
        this.triggerAllProperties();

        return true;
    }

    public triggerSpecificAreaOnEnter(area: AreaData): void {
        this.gameMap.getGameMapAreas()?.triggerSpecificAreaOnEnter(area);
    }

    public triggerSpecificAreaOnUpdate(
        area: AreaData,
        oldProperties: AreaDataProperties | undefined,
        newProperties: AreaDataProperties | undefined
    ): void {
        this.gameMap.getGameMapAreas()?.triggerSpecificAreaOnUpdate(area, oldProperties, newProperties);
    }

    public triggerSpecificAreaOnLeave(area: AreaData): void {
        this.gameMap.getGameMapAreas()?.triggerSpecificAreaOnLeave(area);
    }

    public getAreaByName(name: string): AreaData | undefined {
        return this.gameMap.getGameMapAreas()?.getAreaByName(name);
    }

    public getArea(id: string): AreaData | undefined {
        return this.gameMap.getGameMapAreas()?.getArea(id);
    }

    public getDynamicArea(name: string): DynamicArea | undefined {
        return this.dynamicAreas.get(name);
    }

    public deleteDynamicArea(name: string): void {
        this.dynamicAreas.delete(name);
    }

    private isPlayerInsideAreaByCoordinates(
        areaCoordinates: { x: number; y: number; width: number; height: number },
        playerPosition: { x: number; y: number }
    ): boolean {
        return this.isInsideAreaByCoordinates(areaCoordinates, playerPosition);
    }

    public listenAreaCreation(areaData: AreaData): void {
        if (this.position === undefined) {
            return;
        }

        if (this.isPlayerInsideAreaByCoordinates(areaData, this.position)) {
            this.triggerSpecificAreaOnEnter(areaData);
        }

        if (!this.areasManager) {
            throw new Error("AreasManager is not initialized. Are you on a public map?");
        }
        this.areasManager.addArea(areaData);
    }

    public listenAreaChanges(oldConfig: AtLeast<AreaData, "id">, newConfig: AtLeast<AreaData, "id">): void {
        if (this.position === undefined) {
            return;
        }

        const isOldCoordinates = AreaCoordinates.safeParse(oldConfig);
        const isNewCoordinates = AreaCoordinates.safeParse(newConfig);

        if (!isOldCoordinates.success) {
            throw new Error("Something wrong happen! Area coordinates are not defined");
        }

        const area = this.gameMap.getGameMapAreas()?.getArea(oldConfig.id);

        if (!area) {
            console.error("Area with id " + oldConfig.id + " does not exist, this not supposed to happen");
            return;
        }

        const oldAreaCoordinates = isOldCoordinates.data;
        const newAreaCoordinates = isNewCoordinates.success ? isNewCoordinates.data : oldAreaCoordinates;

        const isPlayerWasInsideArea = this.isPlayerInsideAreaByCoordinates(oldAreaCoordinates, this.position);
        const isPlayerInsideArea = this.isPlayerInsideAreaByCoordinates(newAreaCoordinates, this.position);

        if (isPlayerWasInsideArea && isPlayerInsideArea) {
            if (JSON.stringify(oldConfig.properties) !== JSON.stringify(newConfig.properties)) {
                this.triggerSpecificAreaOnUpdate(area, oldConfig.properties, newConfig.properties);
            }
        } else if (isPlayerWasInsideArea && !isPlayerInsideArea) {
            this.triggerSpecificAreaOnLeave(area);
            return;
        } else if (!isPlayerWasInsideArea && isPlayerInsideArea) {
            this.triggerSpecificAreaOnEnter(area);
            return;
        }
        if (!this.areasManager) {
            throw new Error("AreasManager is not initialized. Are you on a public map?");
        }
        this.areasManager.updateArea(newConfig);
    }

    public listenAreaDeletion(areaData: AreaData | undefined) {
        if (areaData === undefined || this.position === undefined) {
            console.error('Area with id "' + areaData?.id + '" does not exist, this not supposed to happen');
            return;
        }

        if (this.isPlayerInsideAreaByCoordinates(areaData, this.position)) {
            this.triggerSpecificAreaOnLeave(areaData);
        }
        if (!this.areasManager) {
            throw new Error("AreasManager is not initialized. Are you on a public map?");
        }
        this.areasManager.removeArea(areaData.id);
    }

    public getMapChangedObservable(): Observable<number[][]> {
        return this.mapChangedSubject.asObservable();
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

    public getActivatableEntities(): Entity[] {
        return this.entitiesManager.getActivatableEntities();
    }

    public handleEntityActionTrigger(): void {
        this.triggerAllProperties();
    }

    /**
     * Parse map-editor AreaData to ITiledMapObject format in order to handle properties changes
     */
    public mapAreaToTiledObject(areaData: AreaData): ITiledPlace {
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

    public mapDynamicAreaToTiledObject(dynamicArea: DynamicArea): ITiledPlace {
        return {
            id: dynamicArea.name,
            type: "area",
            class: "area",
            name: dynamicArea.name,
            visible: true,
            x: dynamicArea.x,
            y: dynamicArea.y,
            width: dynamicArea.width,
            height: dynamicArea.height,
            properties: this.mapDynamicAreaPropertiesToTiledProperties(dynamicArea.properties),
        };
    }

    private mapDynamicAreaPropertiesToTiledProperties(dynamicAreaProperties: {
        [key: string]: unknown;
    }): ITiledMapProperty[] {
        const properties: ITiledMapProperty[] = [];
        for (const key in dynamicAreaProperties) {
            const property = dynamicAreaProperties[key];
            if (typeof property === "string") {
                properties.push({ name: key, type: "string", value: property });
                continue;
            }
            if (typeof property === "number") {
                properties.push({ name: key, type: "float", value: property });
                continue;
            }
            if (typeof property === "boolean") {
                properties.push({ name: key, type: "bool", value: property });
                continue;
            }
        }
        return properties;
    }

    private mapTiledPropertiesToDynamicAreaProperties(tiledProperties: ITiledMapProperty[]): {
        [key: string]: unknown;
    } {
        const properties: { [key: string]: unknown } = {};
        for (const tiledProperty of tiledProperties) {
            properties[tiledProperty.name] = tiledProperty.value;
        }
        return properties;
    }

    private mapAreaPropertiesToTiledProperties(areaProperties: AreaDataProperties): ITiledMapProperty[] {
        const properties: ITiledMapProperty[] = [];

        for (const property of areaProperties) {
            switch (property.type) {
                case "focusable": {
                    properties.push({ name: GameMapProperties.FOCUSABLE, type: "bool", value: true });
                    if (property.zoom_margin) {
                        properties.push({
                            name: GameMapProperties.ZOOM_MARGIN,
                            type: "float",
                            value: property.zoom_margin,
                        });
                    }
                    break;
                }
                case "jitsiRoomProperty": {
                    properties.push({
                        name: GameMapProperties.JITSI_ROOM,
                        type: "string",
                        value: property.roomName ?? "",
                    });
                    if (property.jitsiRoomConfig) {
                        properties.push({
                            name: GameMapProperties.JITSI_CONFIG,
                            type: "class",
                            value: property.jitsiRoomConfig,
                        });
                    }
                    break;
                }
                case "openWebsite": {
                    if (property.newTab) {
                        properties.push({
                            name: GameMapProperties.OPEN_TAB,
                            type: "string",
                            value: property.link ?? undefined,
                        });
                    } else {
                        properties.push({
                            name: GameMapProperties.OPEN_WEBSITE,
                            type: "string",
                            value: property.link ?? undefined,
                        });
                    }
                    break;
                }
                case "playAudio": {
                    properties.push({
                        name: GameMapProperties.PLAY_AUDIO,
                        type: "string",
                        value: property.audioLink,
                    });
                    break;
                }
                case "silent": {
                    properties.push({
                        name: GameMapProperties.SILENT,
                        type: "bool",
                        value: true,
                    });
                    break;
                }
                case "start": {
                    properties.push({
                        name: GameMapProperties.START,
                        type: "bool",
                        value: true,
                    });
                    break;
                }
                case "speakerMegaphone": {
                    properties.push({
                        name: GameMapProperties.SPEAKER_MEGAPHONE,
                        type: "string",
                        value: `${property.id}-${property.name}`,
                    });
                    break;
                }
                case "listenerMegaphone": {
                    properties.push({
                        name: GameMapProperties.LISTENER_MEGAPHONE,
                        type: "string",
                        value: property.speakerZoneName,
                    });
                }
            }
        }
        return properties;
    }

    public triggerAllProperties(): void {
        if (this.key === undefined) return;
        const newProps = this.getProperties(this.key);
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

    private getLayerCollisionGrid(layer: TilemapLayer): (1 | 2 | 3 | 0)[][] {
        let isExitLayer = false;
        const isStartLayer = layer.layer.name === "start";
        for (const property of layer.layer.properties as { [key: string]: string | number | boolean }[]) {
            if (property.name && property.name === "exitUrl") {
                isExitLayer = true;
            }
        }

        return layer.layer.data.map((row) =>
            row.map((tile) =>
                tile.properties?.[GameMapProperties.COLLIDES]
                    ? 1
                    : (isExitLayer && tile.index !== -1) ||
                      tile.properties?.[GameMapProperties.EXIT_URL] ||
                      tile.properties?.[GameMapProperties.EXIT_SCENE_URL]
                    ? 2
                    : (isStartLayer && tile.index !== -1) ||
                      tile.properties?.[GameMapProperties.START] ||
                      tile.properties?.[GameMapProperties.START_LAYER]
                    ? 3
                    : 0
            )
        );
    }

    private getProperties(key: number): Map<string, string | boolean | number> {
        const properties = new Map<string, string | boolean | number>();
        // NOTE: WE DO NOT WANT AREAS TO BE THE PART OF THE OLD PROPERTIES CHANGE SYSTEM
        // CHECK FOR AREAS PROPERTIES
        //if (this.position) {
        //    const areasProperties = this.gameMap.getGameMapAreas()?.getProperties(this.position);
        //    if (areasProperties) {
        //        for (const [key, value] of areasProperties) {
        //            properties.set(key, value);
        //        }
        //    }
        //}

        // CHECK FOR DYNAMIC AREAS PROPERTIES
        if (this.position) {
            const dynamicAreasProperties = this.getDynamicAreasProperties(this.position);
            if (dynamicAreasProperties) {
                for (const [key, value] of dynamicAreasProperties) {
                    properties.set(key, value);
                }
            }
        }

        // CHECK FOR ENTITIES PROPERTIES
        if (this.entitiesManager) {
            for (const [key, value] of this.entitiesManager.getProperties()) {
                properties.set(key, value);
            }
        }

        // CHECK FOR LAYERS PROPERTIES
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

    private triggerDynamicAreasChange(
        oldPosition: { x: number; y: number } | undefined,
        position: { x: number; y: number } | undefined
    ): boolean {
        const areasByOldPosition = oldPosition ? this.getDynamicAreasOnPosition(oldPosition) : [];
        const areasByNewPosition = position ? this.getDynamicAreasOnPosition(position) : [];

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

            for (const callback of this.enterDynamicAreaCallbacks) {
                callback(areasArray, areasByNewPosition);
            }
            areasChange = true;
        }

        if (leaveAreas.size > 0) {
            const areasArray = Array.from(leaveAreas);
            for (const callback of this.leaveDynamicAreaCallbacks) {
                callback(areasArray, areasByNewPosition);
            }
            areasChange = true;
        }
        return areasChange;
    }

    public getDynamicAreasOnPosition(position: { x: number; y: number }, offsetY = 16): DynamicArea[] {
        const overlappedDynamicAreas: DynamicArea[] = [];
        for (const dynamicArea of this.dynamicAreas.values()) {
            if (
                MathUtils.isOverlappingWithRectangle(
                    { x: position.x, y: position.y + offsetY },
                    { x: dynamicArea.x, y: dynamicArea.y, width: dynamicArea.width, height: dynamicArea.height }
                )
            ) {
                overlappedDynamicAreas.push(dynamicArea);
            }
        }
        return overlappedDynamicAreas;
    }

    private getDynamicAreasProperties(position: { x: number; y: number }): Map<string, string | number | boolean> {
        const properties = new Map<string, string | number | boolean>();
        for (const dynamicArea of this.getDynamicAreasOnPosition(position, 16)) {
            if (dynamicArea.properties === undefined) {
                continue;
            }
            for (const key in dynamicArea.properties) {
                const property = dynamicArea.properties[key];
                if (property === undefined) {
                    continue;
                }
                if (typeof property === "string" || typeof property === "number" || typeof property === "boolean") {
                    properties.set(key, property);
                }
            }
        }
        return properties;
    }

    public isInsideAreaByCoordinates(
        areaCoordinates: { x: number; y: number; width: number; height: number },
        objectCoordinates: { x: number; y: number }
    ) {
        return MathUtils.isOverlappingWithRectangle(objectCoordinates, areaCoordinates);
    }

    public close() {
        this.entitiesManager.close();
    }
}
