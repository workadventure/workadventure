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
        this.gameMap.setPosition(x, y);
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
        this.gameMap.onEnterLayer(callback);
    }

    /**
     * Registers a callback called when the user moves outside another layer.
     */
    public onLeaveLayer(callback: layerChangeCallback) {
        this.gameMap.onLeaveLayer(callback);
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
        this.gameMap.setLayerProperty(layerName, propertyName, propertyValue);
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
        this.gameMap.setAreaProperty(areaName, areaType, propertyName, propertyValue);
    }

    public getAreas(areaType: AreaType): ITiledMapRectangleObject[] {
        return this.gameMap.getAreas(areaType);
    }

    public addArea(area: ITiledMapRectangleObject, type: AreaType): void {
        this.gameMap.addArea(area, type);
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
        this.gameMap.updateAreaByName(name, type, config);
    }

    public updateAreaById(id: number, type: AreaType, config: Partial<ITiledMapRectangleObject>): void {
        this.gameMap.updateAreaById(id, type, config);
    }

    public deleteAreaByName(name: string, type: AreaType): void {
        this.gameMap.deleteAreaByName(name, type);
    }

    public deleteAreaById(id: number, type: AreaType): void {
        this.gameMap.deleteAreaById(id, type);
    }

    public isPlayerInsideArea(id: number, type: AreaType): boolean {
        return this.gameMap.isPlayerInsideArea(id, type);
    }

    public isPlayerInsideAreaByName(name: string, type: AreaType): boolean {
        return this.gameMap.isPlayerInsideAreaByName(name, type);
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
}
