import {
    AreaDataProperties,
    EntityData,
    EntityDataProperties,
    EntityDimensions,
    EntityPrefabRef,
    WAMEntityData,
} from "@workadventure/map-editor";
import { Observable, Subject } from "rxjs";
import { get, Unsubscriber } from "svelte/store";
import { z } from "zod";
import * as Sentry from "@sentry/svelte";
import { actionsMenuStore } from "../../../Stores/ActionsMenuStore";
import {
    mapEditorEntityModeStore,
    mapEditorModeStore,
    mapEditorSelectedEntityDraggedStore,
    mapEditorSelectedEntityPrefabStore,
    mapEditorSelectedEntityStore,
    mapEditorSelectedToolStore,
} from "../../../Stores/MapEditorStore";
import { Entity, EntityEvent } from "../../ECS/Entity";
import { TexturesHelper } from "../../Helpers/TexturesHelper";
import type { GameScene } from "../GameScene";
import { EditorToolName } from "../MapEditor/MapEditorModeManager";
import type { GameMapFrontWrapper } from "./GameMapFrontWrapper";

export const CopyEntityEventData = z.object({
    position: z.object({
        x: z.number(),
        y: z.number(),
    }),
    prefabRef: EntityPrefabRef,
    properties: EntityDataProperties.optional(),
    entityDimensions: EntityDimensions,
});

export const CopyAreaEventData = z.object({
    position: z.object({
        x: z.number(),
        y: z.number(),
    }),
    width: z.number(),
    height: z.number(),
    name: z.string(),
    description: z.string(),
    properties: AreaDataProperties.optional(),
});

export type CopyEntityEventData = z.infer<typeof CopyEntityEventData>;
export type CopyAreaEventData = z.infer<typeof CopyAreaEventData>;

export enum EntitiesManagerEvent {
    DeleteEntity = "EntitiesManagerEvent:DeleteEntity",
    UpdateEntity = "EntitiesManagerEvent:UpdateEntity",
    CopyEntity = "EntitiesManagerEvent:CopyEntity",
}

export class EntitiesManager extends Phaser.Events.EventEmitter {
    private scene: GameScene;
    private gameMapFrontWrapper: GameMapFrontWrapper;

    private shiftKey?: Phaser.Input.Keyboard.Key;
    private ctrlKey?: Phaser.Input.Keyboard.Key;

    private entities: Map<string, Entity>;
    private activatableEntities: Entity[];

    private properties: Map<string, string | boolean | number>;
    private actionsMenuStoreUnsubscriber: Unsubscriber;

    /**
     * Firing on map change, containing newest collision grid array
     */
    private pointerOverEntitySubject = new Subject<Entity>();
    private pointerOutEntitySubject = new Subject<Entity>();

    constructor(scene: GameScene, gameMapFrontWrapper: GameMapFrontWrapper) {
        super();
        this.scene = scene;
        this.gameMapFrontWrapper = gameMapFrontWrapper;
        this.shiftKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.ctrlKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
        this.entities = new Map<string, Entity>();
        this.activatableEntities = [];
        this.properties = new Map<string, string | boolean | number>();

        // clear properties immediately on every ActionsMenu change
        this.actionsMenuStoreUnsubscriber = actionsMenuStore.subscribe((data) => {
            this.clearProperties();
            this.gameMapFrontWrapper.handleEntityActionTrigger();
        });

        // When the GameScene is loaded (connection established, etc.), we update all entities
        this.scene.sceneReadyToStartPromise
            .then(() => {
                this.makeAllEntitiesInteractive(true);
            })
            .catch((e) => {
                console.error(e);
                Sentry.captureException(e);
            });

        this.bindEventHandlers();
    }

    public async addEntity(
        entityId: string,
        data: WAMEntityData,
        imagePathPrefix?: string,
        interactive?: boolean,
        withGridUpdate?: boolean
    ): Promise<Entity> {
        const prefab = await this.scene
            .getEntitiesCollectionsManager()
            .getEntityPrefab(data.prefabRef.collectionName, data.prefabRef.id);
        if (prefab === undefined) {
            console.warn(`Could not find entity ${data.prefabRef.id} in collection ${data.prefabRef.collectionName}`);
            return Promise.reject(
                new Error(`Could not find entity ${data.prefabRef.id} in collection ${data.prefabRef.collectionName}`)
            );
        }

        const entity = new Entity(this.scene, entityId, data, prefab);
        entity.setVisible(false);

        TexturesHelper.loadEntityImage(this.scene, prefab.imagePath, `${imagePathPrefix ?? ""}${prefab.imagePath}`)
            .then(() => {
                const entity = this.entities.get(entityId);
                if (entity) {
                    entity
                        .setTexture(prefab.imagePath)
                        .setDepth(entity.y + entity.displayHeight + (entity.getPrefab().depthOffset ?? 0))
                        .setVisible(true);
                }
            })
            .catch((e) => console.error(e));

        if (interactive) {
            entity.setInteractive({ pixelPerfect: true, cursor: "pointer" });
            this.scene.input.setDraggable(entity);
        }

        this.bindEntityEventHandlers(entity);

        const colGrid = entity.getCollisionGrid();
        if (colGrid) {
            this.gameMapFrontWrapper.modifyToCollisionsLayer(entity.x, entity.y, "0", colGrid, withGridUpdate);
        }

        this.entities.set(entityId, entity);

        // We use the promise to be sure that the entity is fully loaded before we check if it is activatable and push it to the activatableEntities array
        this.scene
            .getEntityPermissionsPromise()
            .then(() => {
                if (entity.isActivatable()) {
                    this.activatableEntities.push(entity);
                }
            })
            .catch((e) => {
                console.error(e);
            });

        this.scene.markDirty();
        return entity;
    }

    public deleteEntity(id: string): boolean {
        const entity = this.entities.get(id);
        if (!entity) {
            console.warn(`Entity ${id} already deleted`);
            return false;
        }

        if (entity.isActivatable()) {
            const index = this.activatableEntities.findIndex((entity) => entity.entityId === id);
            if (index !== -1) {
                this.activatableEntities.splice(index, 1);
            }
        }

        const colGrid = entity.getReversedCollisionGrid();
        if (colGrid) {
            this.gameMapFrontWrapper.modifyToCollisionsLayer(entity.x, entity.y, "0", colGrid);
        }
        entity.destroy();
        this.scene.markDirty();

        return this.entities.delete(id);
    }

    public deleteEntities(idsToRemove: string[]): boolean {
        const removedEntitiesStatus: boolean[] = idsToRemove.map((id) => this.deleteEntity(id));
        return removedEntitiesStatus.every(Boolean);
    }

    public updateEntitiesDepth(modifiedEntityPrefabId: string, depthOffset: number) {
        const entities = this.getEntities();
        for (const entity of entities.values()) {
            const entityPrefab = entity.getPrefab();
            if (entityPrefab.id === modifiedEntityPrefabId) {
                if (entityPrefab.depthOffset !== depthOffset) {
                    entity.setDepth(entity.y + entity.displayHeight + depthOffset);
                }
            }
        }
    }

    public getProperties(): Map<string, string | boolean | number> {
        return this.properties;
    }

    public clearAllEntitiesTint(): void {
        this.entities.forEach((entity) => entity.clearTint());
    }

    public clearAllEntitiesEditOutlines(): void {
        this.entities.forEach((entity) => entity.removeEditColor());
        this.entities.forEach((entity) => entity.removePointedToEditColor());
    }

    public makeAllEntitiesNonInteractive(): void {
        this.entities.forEach((entity) => {
            entity.disableInteractive();
        });
    }

    public makeAllEntitiesInteractive(activatableOnly = false): void {
        const entities = activatableOnly
            ? Array.from(this.entities.values()).filter((entity) => entity.isActivatable())
            : this.entities;
        entities.forEach((entity) => {
            entity.setInteractive({ pixelPerfect: true, cursor: "pointer" });
            this.scene.input.setDraggable(entity);
        });
    }

    private bindEventHandlers(): void {
        this.ctrlKey?.on("down", () => {
            if (!this.scene.input.activePointer.leftButtonDown()) {
                return;
            }
            const entity = get(mapEditorSelectedEntityStore);
            if (!entity) {
                return;
            }
            this.scene.input.setDefaultCursor("copy");
        });
        this.ctrlKey?.on("up", () => {
            this.scene.input.setDefaultCursor("auto");
        });

        this.shiftKey?.on(Phaser.Input.Keyboard.Events.DOWN, () => {
            const entity = get(mapEditorSelectedEntityStore);
            if (!entity) {
                return;
            }
            this.changeEntityTint(entity);
        });

        this.shiftKey?.on(Phaser.Input.Keyboard.Events.UP, () => {
            const entity = get(mapEditorSelectedEntityStore);
            if (!entity) {
                return;
            }
            this.changeEntityTint(entity);
        });
    }

    private bindEntityEventHandlers(entity: Entity): void {
        entity.on(EntityEvent.Delete, () => {
            this.emit(EntitiesManagerEvent.DeleteEntity, entity);
        });
        // get the type! Switch to rxjs?
        entity.on(
            EntityEvent.PropertyActivated,
            (...datas: { propertyName: string; propertyValue: string | number | boolean }[]) => {
                datas.forEach((data) => this.properties.set(data.propertyName, data.propertyValue));
                this.gameMapFrontWrapper.handleEntityActionTrigger();
            }
        );
        entity.on(EntityEvent.Updated, (data: EntityData) => {
            this.emit(EntitiesManagerEvent.UpdateEntity, data);
        });
        entity.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (!entity.canEdit) {
                return;
            }
            if (
                get(mapEditorModeStore) &&
                this.isEntityEditorToolActive() &&
                get(mapEditorEntityModeStore) === "EDIT"
            ) {
                const collisitonGrid = entity.getPrefab().collisionGrid;
                const depthOffset = entity.getPrefab().depthOffset ?? 0;
                const tileDim = this.scene.getGameMapFrontWrapper().getTileDimensions();
                entity.x =
                    collisitonGrid || this.shiftKey?.isDown
                        ? Math.floor(dragX / tileDim.width) * tileDim.width
                        : Math.floor(dragX);
                entity.y =
                    collisitonGrid || this.shiftKey?.isDown
                        ? Math.floor(dragY / tileDim.height) * tileDim.height
                        : Math.floor(dragY);
                entity.setDepth(entity.y + entity.displayHeight + depthOffset);

                this.changeEntityTint(entity);
            }
        });
        entity.on(Phaser.Input.Events.DRAG_END, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (
                get(mapEditorModeStore) &&
                this.isEntityEditorToolActive() &&
                get(mapEditorEntityModeStore) === "EDIT"
            ) {
                mapEditorSelectedEntityDraggedStore.set(false);
                if (
                    !this.scene
                        .getGameMapFrontWrapper()
                        .canEntityBePlacedOnMap(
                            entity.getTopLeft(),
                            entity.displayWidth,
                            entity.displayHeight,
                            entity.getCollisionGrid(),
                            entity.getOldPosition(),
                            this.shiftKey?.isDown
                        )
                ) {
                    const oldPos = entity.getOldPosition();
                    entity.setPosition(oldPos.x, oldPos.y);
                    entity.clearTint();
                } else {
                    if (this.ctrlKey?.isDown) {
                        this.copyEntity(entity);
                    } else {
                        const data: Partial<EntityData> = {
                            id: entity.entityId,
                            x: entity.x,
                            y: entity.y,
                        };
                        this.emit(EntitiesManagerEvent.UpdateEntity, data);
                    }
                }
                this.scene.markDirty();
            }
        });
        entity.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
            if (pointer.downElement?.tagName !== "CANVAS") {
                return;
            }

            if (!entity.canEdit) {
                return;
            }

            if (
                get(mapEditorModeStore) &&
                this.isEntityEditorToolActive() &&
                !get(mapEditorSelectedEntityPrefabStore)
            ) {
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }

                if (this.isTrashEditorToolActive()) {
                    return;
                }

                if (!entity.canEdit) {
                    return;
                }

                mapEditorEntityModeStore.set("EDIT");
                mapEditorSelectedEntityDraggedStore.set(true);
                mapEditorSelectedEntityStore.set(entity);
            }
        });
        entity.on(Phaser.Input.Events.POINTER_OVER, (pointer: Phaser.Input.Pointer) => {
            this.pointerOverEntitySubject.next(entity);
            if (get(mapEditorModeStore)) {
                if (!entity.canEdit) {
                    return;
                }
                if (this.isEntityEditorToolActive()) {
                    entity.setPointedToEditColor(this.isTrashEditorToolActive() ? 0xff0000 : 0x00ff00);
                    this.scene.markDirty();
                }
                if (this.isExplorerToolActive()) {
                    entity.setPointedToEditColor(0xf9e82d);
                    this.scene.markDirty();
                }
            }
        });
        entity.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.pointerOutEntitySubject.next(entity);
            if (get(mapEditorModeStore)) {
                if (this.isEntityEditorToolActive() || this.isExplorerToolActive()) {
                    entity.removePointedToEditColor();
                    this.scene.markDirty();
                }
            }
        });
    }

    private copyEntity(entity: Entity): void {
        const positionToPlaceCopyAt = { ...entity.getPosition() };
        const oldPos = entity.getOldPosition();
        entity.setPosition(oldPos.x, oldPos.y);
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        mapEditorSelectedEntityStore.set(undefined);
        const eventData: CopyEntityEventData = {
            position: positionToPlaceCopyAt,
            prefabRef: entity.getEntityData().prefabRef,
            properties: entity.getEntityData().properties,
            entityDimensions: { width: entity.width, height: entity.height },
        };
        this.emit(EntitiesManagerEvent.CopyEntity, eventData);
    }

    private changeEntityTint(entity: Entity): void {
        if (
            !this.scene
                .getGameMapFrontWrapper()
                .canEntityBePlacedOnMap(
                    entity.getTopLeft(),
                    entity.displayWidth,
                    entity.displayHeight,
                    entity.getCollisionGrid(),
                    entity.getOldPosition(),
                    this.shiftKey?.isDown
                )
        ) {
            entity.setTint(0xff0000);
        } else {
            if (this.shiftKey?.isDown) {
                entity.setTint(0xffa500);
            } else {
                entity.clearTint();
            }
        }
        this.scene.markDirty();
    }

    private isEntityEditorToolActive(): boolean {
        return (
            get(mapEditorSelectedToolStore) === EditorToolName.EntityEditor ||
            get(mapEditorSelectedToolStore) === EditorToolName.TrashEditor
        );
    }

    private isTrashEditorToolActive(): boolean {
        return get(mapEditorSelectedToolStore) === EditorToolName.TrashEditor;
    }

    private isExplorerToolActive(): boolean {
        return get(mapEditorSelectedToolStore) === EditorToolName.ExploreTheRoom;
    }

    public getEntities(): Map<string, Entity> {
        return this.entities;
    }

    public getEntitiesInsideArea(areaId: string): Map<string, Entity> {
        const entitiesInsideArea = new Map<string, Entity>();
        const gameMapFrontWrapper = this.scene.getGameMapFrontWrapper();
        const area = this.scene.getGameMap().getGameMapAreas()?.getArea(areaId);
        if (area === undefined) {
            return entitiesInsideArea;
        }

        this.entities.forEach((entity, entityId) => {
            if (
                gameMapFrontWrapper.isInsideAreaByCoordinates(
                    { x: area.x, y: area.y, width: area.width, height: area.height },
                    {
                        x: entity.getBounds().centerX,
                        y: entity.getBounds().centerY,
                    }
                )
            ) {
                entitiesInsideArea.set(entityId, entity);
            }
        });
        return entitiesInsideArea;
    }

    public getActivatableEntities(): Entity[] {
        return this.activatableEntities;
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

    public close() {
        this.actionsMenuStoreUnsubscriber();
    }
}
