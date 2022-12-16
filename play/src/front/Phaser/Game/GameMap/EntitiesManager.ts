import { AtLeast, EntityData } from "@workadventure/map-editor";
import { Observable, Subject } from "rxjs";
import { get } from 'svelte/store';
import { actionsMenuStore } from "../../../Stores/ActionsMenuStore";
import { mapEditorModeStore, mapEditorSelectedEntityStore, MapEntityEditorMode, mapEntityEditorModeStore } from '../../../Stores/MapEditorStore';
import { Entity, EntityEvent } from "../../ECS/Entity";
import { TexturesHelper } from "../../Helpers/TexturesHelper";
import type { GameScene } from "../GameScene";
import type { GameMapFrontWrapper } from "./GameMapFrontWrapper";

export enum EntitiesManagerEvent {
    RemoveEntity = "EntitiesManagerEvent:RemoveEntity",
    UpdateEntity = "EntitiesManagerEvent:UpdateEntity",
}

export class EntitiesManager extends Phaser.Events.EventEmitter {
    private scene: GameScene;
    private gameMapFrontWrapper: GameMapFrontWrapper;

    private entities: Entity[];

    private properties: Map<string, string | boolean | number>;

    /**
     * Firing on map change, containing newest collision grid array
     */
    private pointerOverEntitySubject = new Subject<Entity>();
    private pointerOutEntitySubject = new Subject<Entity>();

    constructor(scene: GameScene, gameMapFrontWrapper: GameMapFrontWrapper) {
        super();
        this.scene = scene;
        this.gameMapFrontWrapper = gameMapFrontWrapper;
        this.entities = [];
        this.properties = new Map<string, string | boolean | number>();

        // clear properties immediately on every ActionsMenu change
        actionsMenuStore.subscribe((data) => {
            this.clearProperties();
            this.gameMapFrontWrapper.handleEntityActionTrigger();
        });
    }

    public async addEntity(data: EntityData, imagePathPrefix?: string): Promise<void> {
        await TexturesHelper.loadEntityImage(
            this.scene,
            data.prefab.imagePath,
            `${imagePathPrefix ?? ""}${data.prefab.imagePath}`
        );
        const entity = new Entity(this.scene, data);

        this.bindEntityEventHandlers(entity);

        const colGrid = entity.getCollisionGrid();
        if (colGrid) {
            this.gameMapFrontWrapper.modifyToCollisionsLayer(
                entity.getTopLeft().x,
                entity.getTopLeft().y,
                "0",
                colGrid
            );
        }

        this.entities.push(entity);
        this.scene.markDirty();
    }

    public deleteEntity(id: number): boolean {
        const index = this.entities.findIndex((ent) => ent.getEntityData().id === id);
        if (index === -1) {
            return false;
        }
        const entity = this.entities[index];
        this.entities.splice(index, 1);

        const colGrid = entity.getReversedCollisionGrid();
        if (colGrid) {
            this.gameMapFrontWrapper.modifyToCollisionsLayer(
                entity.getTopLeft().x,
                entity.getTopLeft().y,
                "0",
                colGrid
            );
        }

        entity.destroy();
        this.scene.markDirty();
        return true;
    }

    public getProperties(): Map<string, string | boolean | number> {
        return this.properties;
    }

    public makeAllEntitiesNonInteractive(): void {
        this.entities.forEach((entity) => entity.disableInteractive());
    }

    public clearAllEntitiesTint(): void {
        this.entities.forEach((entity) => entity.clearTint());
    }

    public makeAllEntitiesInteractive(): void {
        this.entities.forEach((entity) => entity.setInteractive({ pixelPerfect: true, cursor: "pointer" }));
    }

    private bindEntityEventHandlers(entity: Entity): void {
        entity.on(EntityEvent.Remove, () => {
            this.emit(EntitiesManagerEvent.RemoveEntity, entity);
        });
        // get the type! Switch to rxjs?
        entity.on(
            EntityEvent.PropertyActivated,
            (...datas: { propertyName: string; propertyValue: string | number | boolean }[]) => {
                datas.forEach((data)=>this.properties.set(data.propertyName, data.propertyValue));
                this.gameMapFrontWrapper.handleEntityActionTrigger();
            }
        );
        entity.on(
            EntityEvent.PropertiesUpdated,
            (key: string, value: unknown) => {
                const data: AtLeast<EntityData, 'id'> = {
                    id: entity.getEntityData().id,
                    properties: { [key]: value },
                }
                this.emit(EntitiesManagerEvent.UpdateEntity, data);
            }
        );
        entity.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.pointerOverEntitySubject.next(entity);
        });
        entity.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.pointerOutEntitySubject.next(entity);
        });
        entity.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (get(mapEditorModeStore) && get(mapEntityEditorModeStore) === MapEntityEditorMode.EditMode) {
                const collisitonGrid = entity.getEntityData().prefab.collisionGrid;
                const offsets = this.getPositionOffset(collisitonGrid);
                const tileDim = this.scene.getGameMapFrontWrapper().getTileDimensions();
                entity.x = collisitonGrid
                    ? Math.floor(dragX / tileDim.width) * tileDim.width + offsets.x
                    : Math.floor(dragX);
                entity.y = collisitonGrid
                    ? Math.floor(dragY / tileDim.height) * tileDim.height + offsets.y
                    : Math.floor(dragY);
                entity.setDepth(entity.y + entity.displayHeight * 0.5);

                if (!this.scene.getGameMapFrontWrapper().canEntityBePlaced(
                    entity.getTopLeft().x,
                    entity.getTopLeft().y,
                    entity.displayWidth,
                    entity.displayHeight,
                    entity.getCollisionGrid(),
                )) {
                    entity.setTint(0xff0000);
                } else {
                    entity.clearTint();
                }

                (this.scene as GameScene).markDirty();
            }
        });
        entity.on(Phaser.Input.Events.DRAG_END, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (get(mapEditorModeStore) && get(mapEntityEditorModeStore) === MapEntityEditorMode.EditMode) {
                if (!this.scene.getGameMapFrontWrapper().canEntityBePlaced(
                    entity.getTopLeft().x,
                    entity.getTopLeft().y,
                    entity.displayWidth,
                    entity.displayHeight,
                    entity.getCollisionGrid(),
                )) {
                    const oldPos = entity.getOldPositionTopLeft();
                    entity.setPosition(oldPos.x + entity.displayWidth * 0.5, oldPos.y + entity.displayHeight * 0.5);
                } else {
                    const data: AtLeast<EntityData, 'id'> = {
                        id: entity.getEntityData().id,
                        x: entity.x,
                        y: entity.y,
                    };
                    this.emit(EntitiesManagerEvent.UpdateEntity, data);
                }
                (this.scene as GameScene).markDirty();
            }
        });
        entity.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (get(mapEditorModeStore)) {
                const entityEditorMode = get(mapEntityEditorModeStore);
                switch (entityEditorMode) {
                    case MapEntityEditorMode.EditMode: {
                        mapEditorSelectedEntityStore.set(entity);
                        break;
                    }
                    case MapEntityEditorMode.RemoveMode: {
                        entity.delete();
                        break;
                    }
                }
            }
        });
        entity.on(Phaser.Input.Events.POINTER_OVER, () => {
            if (get(mapEditorModeStore)) {
                const entityEditorMode = get(mapEntityEditorModeStore);
                switch (entityEditorMode) {
                    case MapEntityEditorMode.AddMode: {
                        break;
                    }
                    case MapEntityEditorMode.RemoveMode: {
                        entity.setTint(0xff0000);
                        break;
                    }
                    case MapEntityEditorMode.EditMode: {
                        entity.setTint(0x3498db);
                        break;
                    }
                }
                (this.scene as GameScene).markDirty();
            }
        });
        entity.on(Phaser.Input.Events.POINTER_OUT, () => {
            if (get(mapEditorModeStore)) {
                entity.clearTint();
                (this.scene as GameScene).markDirty();
            }
        });
    }

    public getEntities(): Entity[] {
        return this.entities;
    }

    public getPointerOverEntityObservable(): Observable<Entity> {
        return this.pointerOverEntitySubject.asObservable();
    }

    public getPointerOutEntityObservable(): Observable<Entity> {
        return this.pointerOutEntitySubject.asObservable();
    }

    public clearProperties(): void {
        this.properties.clear();
    }

    private getPositionOffset(collisionGrid?: number[][]): { x: number; y: number } {
        if (!collisionGrid || collisionGrid.length === 0) {
            return { x: 0, y: 0 };
        }
        return {
            x: collisionGrid[0].length % 2 === 1 ? 16 : 0,
            y: collisionGrid.length % 2 === 1 ? 16 : 0,
        };
    }
}
