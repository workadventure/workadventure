import { AtLeast, EntityData, EntityDataProperties, EntityPrefab } from "@workadventure/map-editor";
import { Observable, Subject } from "rxjs";
import { get } from "svelte/store";
import { z } from "zod";
import { actionsMenuStore } from "../../../Stores/ActionsMenuStore";
import {
    mapEditorModeStore,
    mapEditorSelectedEntityPrefabStore,
    mapEditorSelectedEntityStore,
    mapEditorEntityModeStore,
    mapEditorSelectedEntityDraggedStore,
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
    prefab: EntityPrefab,
    properties: EntityDataProperties.optional(),
});

export type CopyEntityEventData = z.infer<typeof CopyEntityEventData>;

export enum EntitiesManagerEvent {
    DeleteEntity = "EntitiesManagerEvent:DeleteEntity",
    UpdateEntity = "EntitiesManagerEvent:UpdateEntity",
    CopyEntity = "EntitiesManagerEvent:CopyEntity",
}

export class EntitiesManager extends Phaser.Events.EventEmitter {
    private scene: GameScene;
    private gameMapFrontWrapper: GameMapFrontWrapper;

    private shiftKey: Phaser.Input.Keyboard.Key;
    private ctrlKey: Phaser.Input.Keyboard.Key;

    private entities: Map<string, Entity>;
    private activatableEntities: Entity[];

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
        this.shiftKey = this.scene.input.keyboard.addKey("SHIFT");
        this.ctrlKey = this.scene.input.keyboard.addKey("CTRL");
        this.entities = new Map<string, Entity>();
        this.activatableEntities = [];
        this.properties = new Map<string, string | boolean | number>();

        // clear properties immediately on every ActionsMenu change
        actionsMenuStore.subscribe((data) => {
            this.clearProperties();
            this.gameMapFrontWrapper.handleEntityActionTrigger();
        });

        this.bindEventHandlers();
    }

    public addEntity(data: EntityData, imagePathPrefix?: string, interactive?: boolean): Entity {
        TexturesHelper.loadEntityImage(
            this.scene,
            data.prefab.imagePath,
            `${imagePathPrefix ?? ""}${data.prefab.imagePath}`
        )
            .then(() => {
                const entity = this.entities.get(data.id);
                if (entity) {
                    entity
                        .setTexture(data.prefab.imagePath)
                        .setDepth(entity.y + entity.displayHeight + (entity.getEntityData().prefab.depthOffset ?? 0));
                }
            })
            .catch((e) => console.error(e));
        const entity = new Entity(this.scene, data);

        if (interactive) {
            entity.setInteractive({ pixelPerfect: true, cursor: "pointer" });
            this.scene.input.setDraggable(entity);
        }

        this.bindEntityEventHandlers(entity);

        const colGrid = entity.getCollisionGrid();
        if (colGrid) {
            this.gameMapFrontWrapper.modifyToCollisionsLayer(entity.x, entity.y, "0", colGrid);
        }

        this.entities.set(data.id, entity);
        if (entity.isActivatable()) {
            this.activatableEntities.push(entity);
        }
        this.scene.markDirty();
        return entity;
    }

    public deleteEntity(id: string): boolean {
        const entity = this.entities.get(id);
        if (!entity) {
            return false;
        }

        if (entity.isActivatable()) {
            const index = this.activatableEntities.findIndex((entity) => entity.getEntityData().id === id);
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
        this.ctrlKey.on("down", () => {
            if (!this.scene.input.activePointer.leftButtonDown()) {
                return;
            }
            const entity = get(mapEditorSelectedEntityStore);
            if (!entity) {
                return;
            }
            this.scene.input.setDefaultCursor("copy");
        });
        this.ctrlKey.on("up", () => {
            this.scene.input.setDefaultCursor("auto");
        });

        this.shiftKey.on(Phaser.Input.Keyboard.Events.DOWN, () => {
            const entity = get(mapEditorSelectedEntityStore);
            if (!entity) {
                return;
            }
            this.changeEntityTint(entity);
        });

        this.shiftKey.on(Phaser.Input.Keyboard.Events.UP, () => {
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
        entity.on(EntityEvent.Updated, (data: AtLeast<EntityData, "id">) => {
            this.emit(EntitiesManagerEvent.UpdateEntity, data);
        });
        entity.on(Phaser.Input.Events.DRAG_START, () => {
            if (
                get(mapEditorModeStore) &&
                this.isEntityEditorToolActive() &&
                get(mapEditorEntityModeStore) === "EDIT"
            ) {
                mapEditorSelectedEntityDraggedStore.set(true);
            }
        });
        entity.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (
                get(mapEditorModeStore) &&
                this.isEntityEditorToolActive() &&
                get(mapEditorEntityModeStore) === "EDIT"
            ) {
                const collisitonGrid = entity.getEntityData().prefab.collisionGrid;
                const depthOffset = entity.getEntityData().prefab.depthOffset ?? 0;
                const tileDim = this.scene.getGameMapFrontWrapper().getTileDimensions();
                entity.x =
                    collisitonGrid || this.shiftKey.isDown
                        ? Math.floor(dragX / tileDim.width) * tileDim.width
                        : Math.floor(dragX);
                entity.y =
                    collisitonGrid || this.shiftKey.isDown
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
                        .canEntityBePlaced(
                            entity.getPosition(),
                            entity.displayWidth,
                            entity.displayHeight,
                            entity.getCollisionGrid(),
                            entity.getOldPosition(),
                            this.shiftKey.isDown
                        )
                ) {
                    const oldPos = entity.getOldPosition();
                    entity.setPosition(oldPos.x, oldPos.y);
                } else {
                    if (this.ctrlKey.isDown) {
                        this.copyEntity(entity);
                    } else {
                        const data: AtLeast<EntityData, "id"> = {
                            id: entity.getEntityData().id,
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
            if (
                get(mapEditorModeStore) &&
                this.isEntityEditorToolActive() &&
                !get(mapEditorSelectedEntityPrefabStore)
            ) {
                mapEditorEntityModeStore.set("EDIT");
                mapEditorSelectedEntityStore.set(entity);
            }
        });
        entity.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.pointerOverEntitySubject.next(entity);

            if (get(mapEditorModeStore) && this.isEntityEditorToolActive()) {
                entity.setPointedToEditColor(0x00ff00);
                this.scene.markDirty();
            }
        });
        entity.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.pointerOutEntitySubject.next(entity);

            if (get(mapEditorModeStore) && this.isEntityEditorToolActive()) {
                entity.removePointedToEditColor();
                this.scene.markDirty();
            }
        });
    }

    private copyEntity(entity: Entity): void {
        const positionToPlaceCopyAt = { ...entity.getPosition() };
        const oldPos = entity.getOldPosition();
        entity.setPosition(oldPos.x, oldPos.y);
        mapEditorSelectedEntityStore.set(undefined);
        const eventData: CopyEntityEventData = {
            position: positionToPlaceCopyAt,
            prefab: entity.getEntityData().prefab,
            properties: entity.getEntityData().properties,
        };
        this.emit(EntitiesManagerEvent.CopyEntity, eventData);
    }

    private changeEntityTint(entity: Entity): void {
        if (
            !this.scene
                .getGameMapFrontWrapper()
                .canEntityBePlaced(
                    entity.getPosition(),
                    entity.displayWidth,
                    entity.displayHeight,
                    entity.getCollisionGrid(),
                    entity.getOldPosition(),
                    this.shiftKey.isDown
                )
        ) {
            entity.setTint(0xff0000);
        } else {
            entity.clearTint();
        }
        this.scene.markDirty();
    }

    private isEntityEditorToolActive(): boolean {
        return get(mapEditorSelectedToolStore) === EditorToolName.EntityEditor;
    }

    public getEntities(): Map<string, Entity> {
        return this.entities;
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
}
