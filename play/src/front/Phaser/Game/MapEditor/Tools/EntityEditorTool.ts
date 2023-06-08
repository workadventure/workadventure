import { EntityData, EntityPrefab, WAMEntityData } from "@workadventure/map-editor";
import { EditMapCommandMessage } from "@workadventure/messages";
import { get, Unsubscriber } from "svelte/store";
import {
    mapEditorCopiedEntityDataPropertiesStore,
    mapEditorModeStore,
    mapEditorSelectedEntityDraggedStore,
    mapEditorSelectedEntityPrefabStore,
    mapEditorSelectedEntityStore,
    mapEditorEntityModeStore,
} from "../../../../Stores/MapEditorStore";
import { Entity } from "../../../ECS/Entity";
import { TexturesHelper } from "../../../Helpers/TexturesHelper";
import { CopyEntityEventData, EntitiesManager, EntitiesManagerEvent } from "../../GameMap/EntitiesManager";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { CreateEntityFrontCommand } from "../Commands/Entity/CreateEntityFrontCommand";
import { DeleteEntityFrontCommand } from "../Commands/Entity/DeleteEntityFrontCommand";
import { UpdateEntityFrontCommand } from "../Commands/Entity/UpdateEntityFrontCommand";
import { MapEditorTool } from "./MapEditorTool";

export class EntityEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    private entitiesManager: EntitiesManager;

    private entityPrefab: EntityPrefab | undefined;
    private entityPrefabPreview: Phaser.GameObjects.Image | undefined;
    private entityOldPositionPreview: Phaser.GameObjects.Image | undefined;

    private shiftKey?: Phaser.Input.Keyboard.Key;

    private mapEditorSelectedEntityPrefabStoreUnsubscriber!: Unsubscriber;
    private mapEntityEditorModeStoreUnsubscriber!: Unsubscriber;
    private mapEditorSelectedEntityStoreUnsubscriber!: Unsubscriber;
    private mapEditorSelectedEntityDraggedStoreUnsubscriber!: Unsubscriber;

    private pointerMoveEventHandler!: (pointer: Phaser.Input.Pointer) => void;
    private pointerDownEventHandler!: (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) => void;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();

        this.shiftKey = this.scene.input.keyboard?.addKey("SHIFT");

        this.entitiesManager = this.scene.getGameMapFrontWrapper().getEntitiesManager();

        this.entityPrefab = undefined;
        this.entityPrefabPreview = undefined;
        this.entityOldPositionPreview = undefined;

        this.subscribeToStores();
        this.bindEntitiesManagerEventHandlers();
    }

    public update(time: number, dt: number): void {}
    public clear(): void {
        this.scene.input.topOnly = false;
        mapEditorEntityModeStore.set("ADD");
        this.entitiesManager.clearAllEntitiesTint();
        this.entitiesManager.clearAllEntitiesEditOutlines();
        this.cleanPreview();
        this.unbindEventHandlers();
    }
    public activate(): void {
        this.scene.input.topOnly = true;
        this.entitiesManager.makeAllEntitiesInteractive();
        this.bindEventHandlers();
    }
    public destroy(): void {
        this.cleanPreview();
        this.unbindEventHandlers();
        this.mapEditorSelectedEntityPrefabStoreUnsubscriber();
        this.mapEntityEditorModeStoreUnsubscriber();
        this.mapEditorSelectedEntityStoreUnsubscriber();
        this.mapEditorSelectedEntityDraggedStoreUnsubscriber();
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.log("EntityEditorTool subscribeToGameMapFrontWrapperEvents");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        switch (event.key.toLowerCase()) {
            case "escape": {
                if (get(mapEditorEntityModeStore) === "EDIT") {
                    mapEditorSelectedEntityStore.set(undefined);
                    mapEditorEntityModeStore.set("ADD");
                    return;
                }
                if (get(mapEditorEntityModeStore) === "ADD") {
                    this.cleanPreview();
                    return;
                }
                break;
            }
            case "backspace":
            case "delete": {
                get(mapEditorSelectedEntityStore)?.delete();
                mapEditorSelectedEntityStore.set(undefined);
                mapEditorEntityModeStore.set("ADD");
                break;
            }
        }
    }
    /**
     * React on commands coming from the outside
     */
    public async handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        const commandId = editMapCommandMessage.id;
        switch (editMapCommandMessage.editMapMessage?.message?.$case) {
            case "createEntityMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.createEntityMessage;
                const entityPrefab = await this.scene
                    .getEntitiesCollectionsManager()
                    .getEntityPrefab(data.collectionName, data.prefabId);

                if (!entityPrefab) {
                    console.warn(`NO PREFAB WAS FOUND FOR: ${data.collectionName} ${data.prefabId}`);
                    return;
                }

                TexturesHelper.loadEntityImage(this.scene, entityPrefab.imagePath, entityPrefab.imagePath)
                    .then(() => {
                        this.entitiesManager.getEntities().get(data.id)?.setTexture(entityPrefab.imagePath);
                    })
                    .catch((reason) => {
                        console.warn(reason);
                    });

                const entityData: WAMEntityData = {
                    x: data.x,
                    y: data.y,
                    prefabRef: {
                        id: entityPrefab.id,
                        collectionName: entityPrefab.collectionName,
                    },
                    properties: data.properties,
                };
                // execute command locally
                await this.mapEditorModeManager.executeCommand(
                    new CreateEntityFrontCommand(
                        this.scene.getGameMap(),
                        data.id,
                        entityData,
                        commandId,
                        this.entitiesManager
                    ),
                    false,
                    false
                );
                break;
            }
            case "deleteEntityMessage": {
                console.log("Handle deleteEntityMessage");
                const id = editMapCommandMessage.editMapMessage?.message.deleteEntityMessage.id;
                await this.mapEditorModeManager.executeCommand(
                    new DeleteEntityFrontCommand(this.scene.getGameMap(), id, commandId, this.entitiesManager),
                    false,
                    false
                );
                break;
            }
            case "modifyEntityMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.modifyEntityMessage;
                await this.mapEditorModeManager.executeCommand(
                    new UpdateEntityFrontCommand(
                        this.scene.getGameMap(),
                        data.id,
                        {
                            ...data,
                            properties: data.modifyProperties ? data.properties : undefined,
                        },
                        commandId,
                        undefined,
                        this.entitiesManager,
                        this.scene
                    ),
                    false,
                    false
                );
                break;
            }
        }
    }

    private subscribeToStores(): void {
        this.mapEditorSelectedEntityPrefabStoreUnsubscriber = mapEditorSelectedEntityPrefabStore.subscribe(
            (entityPrefab: EntityPrefab | undefined): void => {
                this.entityPrefab = entityPrefab;
                if (!entityPrefab) {
                    this.entityPrefabPreview?.destroy();
                    this.entityPrefabPreview = undefined;
                } else {
                    TexturesHelper.loadEntityImage(this.scene, entityPrefab.imagePath, entityPrefab.imagePath)
                        .then(() => {
                            if (this.entityPrefabPreview) {
                                this.entityPrefabPreview.setTexture(entityPrefab.imagePath);
                            } else {
                                const pointer = this.scene.input.activePointer;
                                this.entityPrefabPreview = this.scene.add.image(
                                    Math.floor(pointer.worldX),
                                    Math.floor(pointer.worldY),
                                    entityPrefab.imagePath
                                );
                            }
                            this.scene.markDirty();
                        })
                        .catch(() => {
                            console.error("COULD NOT LOAD THE ENTITY PREVIEW TEXTURE");
                        });
                }
                this.scene.markDirty();
            }
        );

        this.mapEditorSelectedEntityDraggedStoreUnsubscriber = mapEditorSelectedEntityDraggedStore.subscribe(
            (dragged) => {
                if (!dragged) {
                    this.entityOldPositionPreview?.destroy();
                }
            }
        );

        this.mapEditorSelectedEntityStoreUnsubscriber = mapEditorSelectedEntityStore.subscribe((entity) => {
            this.entityOldPositionPreview?.destroy();
            if (!entity) {
                return;
            }
            this.entityOldPositionPreview = this.scene.add
                .image(entity.x, entity.y, entity.texture)
                .setOrigin(0)
                .setAlpha(0.5);
        });

        this.mapEntityEditorModeStoreUnsubscriber = mapEditorEntityModeStore.subscribe((mode) => {
            if (!get(mapEditorModeStore)) {
                return;
            }
            switch (mode) {
                case "ADD": {
                    this.entitiesManager.makeAllEntitiesInteractive();
                    break;
                }
                case "EDIT": {
                    this.entitiesManager.makeAllEntitiesInteractive();
                    this.cleanPreview();
                    break;
                }
            }
        });
    }

    private bindEntitiesManagerEventHandlers(): void {
        this.entitiesManager.on(EntitiesManagerEvent.DeleteEntity, (entity: Entity) => {
            this.mapEditorModeManager
                .executeCommand(
                    new DeleteEntityFrontCommand(
                        this.scene.getGameMap(),
                        entity.entityId,
                        undefined,
                        this.entitiesManager
                    )
                )
                .catch((e) => console.error(e));
        });
        this.entitiesManager.on(EntitiesManagerEvent.UpdateEntity, (entityData: EntityData) => {
            this.mapEditorModeManager
                .executeCommand(
                    new UpdateEntityFrontCommand(
                        this.scene.getGameMap(),
                        entityData.id,
                        entityData,
                        undefined,
                        undefined,
                        this.entitiesManager,
                        this.scene
                    )
                )
                .catch((e) => console.error(e));
        });
        this.entitiesManager.on(EntitiesManagerEvent.CopyEntity, (data: CopyEntityEventData) => {
            if (!CopyEntityEventData.parse(data)) {
                return;
            }
            const entityData: WAMEntityData = {
                x: data.position.x,
                y: data.position.y,
                prefabRef: data.prefabRef,
                properties: data.properties ?? [],
            };
            this.mapEditorModeManager
                .executeCommand(
                    new CreateEntityFrontCommand(
                        this.scene.getGameMap(),
                        undefined,
                        entityData,
                        undefined,
                        this.entitiesManager
                    )
                )
                .catch((e) => console.error(e));
            this.cleanPreview();
        });
    }

    private bindEventHandlers(): void {
        this.pointerMoveEventHandler = (pointer: Phaser.Input.Pointer) => {
            this.handlePointerMoveEvent(pointer);
        };
        this.pointerDownEventHandler = (
            pointer: Phaser.Input.Pointer,
            gameObjects: Phaser.GameObjects.GameObject[]
        ) => {
            this.handlePointerDownEvent(pointer, gameObjects);
        };

        this.shiftKey.on(Phaser.Input.Keyboard.Events.DOWN, () => {
            this.changePreviewTint();
        });

        this.shiftKey.on(Phaser.Input.Keyboard.Events.UP, () => {
            this.changePreviewTint();
        });

        this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.pointerMoveEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
    }

    private unbindEventHandlers(): void {
        this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.pointerMoveEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
    }

    private handlePointerMoveEvent(pointer: Phaser.Input.Pointer): void {
        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return;
        }
        if (this.entityPrefab.collisionGrid || this.shiftKey?.isDown) {
            const offset = this.getEntityPrefabAlignWithGridOffset();
            this.entityPrefabPreview.setPosition(
                Math.floor(pointer.worldX / 32) * 32 + offset.x,
                Math.floor(pointer.worldY / 32) * 32 + offset.y
            );
        } else {
            this.entityPrefabPreview.setPosition(Math.floor(pointer.worldX), Math.floor(pointer.worldY));
        }
        this.entityPrefabPreview.setDepth(
            this.entityPrefabPreview.y +
                this.entityPrefabPreview.displayHeight * 0.5 +
                (this.entityPrefab.depthOffset ?? 0)
        );
        this.changePreviewTint();
    }

    private handlePointerDownEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        if (get(mapEditorEntityModeStore) === "EDIT" && gameObjects.length === 0) {
            mapEditorEntityModeStore.set("ADD");
            mapEditorSelectedEntityStore.set(undefined);
        }
        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return;
        }
        if (
            !this.scene
                .getGameMapFrontWrapper()
                .canEntityBePlaced(
                    this.entityPrefabPreview.getTopLeft(),
                    this.entityPrefabPreview.displayWidth,
                    this.entityPrefabPreview.displayHeight,
                    this.entityPrefab.collisionGrid,
                    undefined,
                    this.shiftKey.isDown
                )
        ) {
            return;
        }
        if (pointer.rightButtonDown()) {
            this.cleanPreview();
            return;
        }
        let x = Math.floor(pointer.worldX);
        let y = Math.floor(pointer.worldY);

        if (this.entityPrefab.collisionGrid || this.shiftKey?.isDown) {
            const offsets = this.getEntityPrefabAlignWithGridOffset();
            x = Math.floor(pointer.worldX / 32) * 32 + offsets.x;
            y = Math.floor(pointer.worldY / 32) * 32 + offsets.y;
        }

        const entityData: WAMEntityData = {
            x: x - this.entityPrefabPreview.displayWidth * 0.5,
            y: y - this.entityPrefabPreview.displayHeight * 0.5,
            prefabRef: this.entityPrefab,
            properties: get(mapEditorCopiedEntityDataPropertiesStore) ?? [],
        };
        this.mapEditorModeManager
            .executeCommand(
                new CreateEntityFrontCommand(
                    this.scene.getGameMap(),
                    undefined,
                    entityData,
                    undefined,
                    this.entitiesManager
                )
            )
            .catch((e) => console.error(e));
    }

    private changePreviewTint(): void {
        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return;
        }
        if (
            !this.scene
                .getGameMapFrontWrapper()
                .canEntityBePlaced(
                    this.entityPrefabPreview.getTopLeft(),
                    this.entityPrefabPreview.displayWidth,
                    this.entityPrefabPreview.displayHeight,
                    this.entityPrefab.collisionGrid,
                    undefined,
                    this.shiftKey.isDown
                )
        ) {
            this.entityPrefabPreview.setTint(0xff0000);
        } else {
            if (this.shiftKey.isDown) {
                this.entityPrefabPreview.setTint(0xffa500);
            } else {
                this.entityPrefabPreview.clearTint();
            }
        }
        this.scene.markDirty();
    }

    private cleanPreview(): void {
        this.entityPrefabPreview?.destroy();
        this.entityPrefabPreview = undefined;
        this.entityPrefab = undefined;
        mapEditorCopiedEntityDataPropertiesStore.set(undefined);
        mapEditorSelectedEntityPrefabStore.set(undefined);
        this.scene.markDirty();
    }

    private getEntityPrefabAlignWithGridOffset(): { x: number; y: number } {
        if (!this.entityPrefab || !this.entityPrefabPreview) {
            return { x: 0, y: 0 };
        }
        const collisionGrid = this.entityPrefab.collisionGrid;
        if (collisionGrid && collisionGrid.length > 0) {
            return {
                x: collisionGrid[0].length % 2 === 1 ? 16 : 0,
                y: collisionGrid.length % 2 === 1 ? 16 : 0,
            };
        }
        return {
            x: Math.floor(this.entityPrefabPreview.displayWidth / 32) % 2 === 1 ? 16 : 0,
            y: Math.floor(this.entityPrefabPreview.displayHeight / 32) % 2 === 1 ? 16 : 0,
        };
    }
}
