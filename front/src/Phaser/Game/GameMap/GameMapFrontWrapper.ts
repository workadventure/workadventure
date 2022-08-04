import { AreaType, ITiledMapRectangleObject } from '@workadventure/map-editor-types';
import { ITiledMap, ITiledMapLayer, ITiledMapObject, ITiledMapProperty } from '@workadventure/tiled-map-type-guard';
import TilemapLayer = Phaser.Tilemaps.TilemapLayer;
import { Observable, Subject } from 'rxjs';
import { GameMap, layerChangeCallback, PropertyChangeCallback } from './GameMap';
import { areaChangeCallback } from './GameMapAreas';

export class GameMapFrontWrapper {

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

    private lastProperties = new Map<string, string | boolean | number>();
    private propertiesChangeCallbacks = new Map<string, Array<PropertyChangeCallback>>();

    private enterLayerCallbacks = Array<layerChangeCallback>();
    private leaveLayerCallbacks = Array<layerChangeCallback>();

    /**
     * Firing on map change, containing newest collision grid array
     */
    private mapChangedSubject = new Subject<number[][]>();
    private areaUpdatedSubject = new Subject<ITiledMapRectangleObject>();

    constructor(gameMap: GameMap) {
        this.gameMap = gameMap;
    }

    public setLayerVisibility(layerName: string, visible: boolean): void {
        this.gameMap.setLayerVisibility(layerName, visible);
    }

    public getPropertiesForIndex(index: number): Array<ITiledMapProperty> {
        return this.gameMap.getPropertiesForIndex(index);
    }

    public getCollisionGrid(modifiedLayer?: TilemapLayer, useCache = true): number[][] {
        return this.gameMap.getCollisionGrid(modifiedLayer, useCache);
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
        return this.gameMap.getCurrentProperties();
    }

    public clearCurrentProperties(): void {
        return this.gameMap.clearCurrentProperties();
    }

    public getMap(): ITiledMap {
        return this.gameMap.getMap();
    }

    /**
     * Registers a callback called when the user moves to a tile where the property propName is different from the last tile the user was on.
     */
    public onPropertyChange(propName: string, callback: PropertyChangeCallback) {
        this.gameMap.onPropertyChange(propName, callback);
    }

    /**
     * Registers a callback called when the user moves inside another layer.
     */
    public onEnterLayer(callback: layerChangeCallback) {
        this.enterLayerCallbacks.push(callback);
    }

    /**
     * Registers a callback called when the user moves outside another layer.
     */
    public onLeaveLayer(callback: layerChangeCallback) {
        this.leaveLayerCallbacks.push(callback);
    }

    public findLayer(layerName: string): ITiledMapLayer | undefined {
        return this.gameMap.findLayer(layerName);
    }

    public findObject(objectName: string, objectClass?: string): ITiledMapObject | undefined {
        return this.gameMap.findObject(objectName, objectClass);
    }

    public findPhaserLayer(layerName: string): TilemapLayer | undefined {
        return this.gameMap.findPhaserLayer(layerName);
    }

    public findPhaserLayers(groupName: string): TilemapLayer[] {
        return this.gameMap.findPhaserLayers(groupName);
    }

    public addTerrain(terrain: Phaser.Tilemaps.Tileset): void {
        this.gameMap.addTerrain(terrain);
    }

    public putTile(tile: string | number | null, x: number, y: number, layer: string): void {
        this.gameMap.putTile(tile, x, y, layer);
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
        this.gameMap.setProperty(layer, propertyName, propertyValue);
        this.triggerAllProperties();
        this.triggerLayersChange();
    }

    /**
     * Trigger all the callbacks (used when exiting a map)
     */
    public triggerExitCallbacks(): void {
        this.gameMap.triggerExitCallbacks();
    }

    public getRandomPositionFromLayer(layerName: string): { x: number; y: number } {
        return this.gameMap.getRandomPositionFromLayer(layerName);
    }

    public getObjectProperty(
        object: { properties?: ITiledMapProperty[] },
        propertyName: string
    ): string | boolean | number | undefined {
        return this.gameMap.getObjectProperty(object, propertyName);
    }

    public getObjectWithName(name: string): ITiledMapObject | undefined {
        return this.gameMap.getObjectWithName(name);
    }

    /**
     * Registers a callback called when the user moves inside another area.
     */
    public onEnterArea(callback: areaChangeCallback) {
        this.gameMap.onEnterArea(callback);
    }

    /**
     * Registers a callback called when the user moves outside another area.
     */
    public onLeaveArea(callback: areaChangeCallback) {
        this.gameMap.onLeaveArea(callback);
    }

    public setAreaProperty(
        areaName: string,
        areaType: AreaType,
        propertyName: string,
        propertyValue: string | number | undefined | boolean
    ): void {
        this.gameMap.setAreaProperty(areaName, areaType, propertyName, propertyValue, this.position, this.oldPosition, this.key);
    }

    public getAreas(areaType: AreaType): ITiledMapRectangleObject[] {
        return this.gameMap.getAreas(areaType);
    }

    public addArea(area: ITiledMapRectangleObject, type: AreaType): void {
        this.gameMap.addArea(area, type, this.position);
    }

    public triggerSpecificAreaOnEnter(area: ITiledMapRectangleObject): void {
        this.gameMap.triggerSpecificAreaOnEnter(area);
    }

    public triggerSpecificAreaOnLeave(area: ITiledMapRectangleObject): void {
        this.gameMap.triggerSpecificAreaOnLeave(area);
    }

    public getAreaByName(name: string, type: AreaType): ITiledMapRectangleObject | undefined {
        return this.gameMap.getAreaByName(name, type);
    }

    public getArea(id: number, type: AreaType): ITiledMapRectangleObject | undefined {
        return this.gameMap.getArea(id, type);
    }

    public updateAreaByName(name: string, type: AreaType, config: Partial<ITiledMapObject>): void {
        this.gameMap.updateAreaByName(name, type, config, this.position);
    }

    public updateAreaById(id: number, type: AreaType, config: Partial<ITiledMapRectangleObject>): void {
        this.gameMap.updateAreaById(id, type, config, this.position);
    }

    public deleteAreaByName(name: string, type: AreaType): void {
        this.gameMap.deleteAreaByName(name, type, this.position);
    }

    public deleteAreaById(id: number, type: AreaType): void {
        this.gameMap.deleteAreaById(id, type, this.position);
    }

    public isPlayerInsideArea(id: number, type: AreaType): boolean {
        return this.gameMap.isPlayerInsideArea(id, type, this.position);
    }

    public isPlayerInsideAreaByName(name: string, type: AreaType): boolean {
        return this.gameMap.isPlayerInsideAreaByName(name, type, this.position);
    }

    public getMapChangedObservable(): Observable<number[][]> {
        return this.gameMap.getMapChangedObservable();
    }

    public getAreaUpdatedObservable(): Observable<ITiledMapRectangleObject> {
        return this.gameMap.getAreaUpdatedObservable();
    }

    public getFlatLayers(): ITiledMapLayer[] {
        return this.gameMap.flatLayers;
    }

    public getExitUrls(): Array<string> {
        return this.gameMap.exitUrls;
    }

    public getPhaserLayers(): TilemapLayer[] {
        return this.gameMap.phaserLayers;
    }

    public hasStartTile(): boolean {
        return this.gameMap.hasStartTile;
    }

    public getGameMap(): GameMap {
        return this.gameMap;
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

    private getProperties(key: number): Map<string, string | boolean | number> {
        const properties = this.gameMap.getGameMapAreas().getProperties(this.position);

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
