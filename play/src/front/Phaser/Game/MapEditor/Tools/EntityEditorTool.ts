import { AtLeast, CommandConfig, EntityData, EntityPrefab } from "@workadventure/map-editor";
import { GameMapEntities } from "@workadventure/map-editor/src/GameMap/GameMapEntities";
import { EditMapCommandMessage } from "@workadventure/messages";
import { get, Unsubscriber } from "svelte/store";
import {
    mapEditorModeStore,
    mapEditorSelectedEntityPrefabStore,
    MapEntityEditorMode,
    mapEntityEditorModeStore,
    mapEntitiesPrefabsStore,
} from "../../../../Stores/MapEditorStore";
import { Entity } from "../../../ECS/Entity";
import { TexturesHelper } from "../../../Helpers/TexturesHelper";
import { EntitiesManager, EntitiesManagerEvent } from "../../GameMap/EntitiesManager";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { MapEditorTool } from "./MapEditorTool";

export class EntityEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    private entitiesManager: EntitiesManager;
    private gameMapEntities: GameMapEntities;

    private entityPrefab: EntityPrefab | undefined;
    private entityPrefabPreview: Phaser.GameObjects.Image | undefined;

    private mapEditorSelectedEntityPrefabStoreUnsubscriber!: Unsubscriber;
    private mapEntityEditorModeStoreUnsubscriber!: Unsubscriber;

    private pointerMoveEventHandler!: (pointer: Phaser.Input.Pointer) => void;
    private pointerDownEventHandler!: (pointer: Phaser.Input.Pointer) => void;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();

        this.entitiesManager = this.scene.getGameMapFrontWrapper().getEntitiesManager();
        this.gameMapEntities = this.scene.getGameMap().getGameMapEntities();

        this.entityPrefab = undefined;
        this.entityPrefabPreview = undefined;

        this.subscribeToStores();
        this.bindEntitiesManagerEventHandlers();
    }

    public update(time: number, dt: number): void {}
    public clear(): void {
        mapEntityEditorModeStore.set(MapEntityEditorMode.AddMode);
        this.entitiesManager.clearAllEntitiesTint();
        this.cleanPreview();
        this.unbindEventHandlers();
    }
    public activate(): void {
        this.bindEventHandlers();
    }
    public destroy(): void {
        this.cleanPreview();
        this.unbindEventHandlers();
        this.mapEditorSelectedEntityPrefabStoreUnsubscriber();
        this.mapEntityEditorModeStoreUnsubscriber();
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.log("EntityEditorTool subscribeToGameMapFrontWrapperEvents");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        console.log("EntityEditorTool handleKeyDownEvent");
    }
    /**
     * Perform actions needed to see the changes instantly
     */
    public handleCommandExecution(commandConfig: CommandConfig): void {
        switch (commandConfig.type) {
            case "UpdateEntityCommand": {
                this.handleEntityUpdate(commandConfig.dataToModify);
                break;
            }
            case "CreateEntityCommand": {
                this.handleEntityCreation(commandConfig.entityData);
                break;
            }
            case "DeleteEntityCommand": {
                this.handleEntityDeletion(commandConfig.id);
                break;
            }
            default: {
                break;
            }
        }
    }
    /**
     * React on commands coming from the outside
     */
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): void {
        switch (editMapCommandMessage.editMapMessage?.message?.$case) {
            case "createEntityMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.createEntityMessage;
                const entityPrefab = mapEntitiesPrefabsStore.getEntityPrefab(data.collecionName, data.prefabId);

                if (!entityPrefab) {
                    console.warn(`NO PREFAB WAS FOUND FOR: ${data.collecionName} ${data.prefabId}`);
                    return;
                }

                TexturesHelper.loadEntityImage(this.scene, entityPrefab.imagePath, entityPrefab.imagePath)
                    .then(() => {
                        const entityData: EntityData = {
                            x: data.x,
                            y: data.y,
                            id: data.id,
                            prefab: entityPrefab,
                            properties: {
                                customProperties: {},
                            },
                        };
                        // execute command locally
                        this.mapEditorModeManager.executeCommand(
                            {
                                type: "CreateEntityCommand",
                                entityData,
                            },
                            false,
                            false
                        );
                    })
                    .catch((reason) => {
                        console.warn(reason);
                    });
                break;
            }
            case "deleteEntityMessage": {
                const id = editMapCommandMessage.editMapMessage?.message.deleteEntityMessage.id;
                this.mapEditorModeManager.executeCommand(
                    {
                        type: "DeleteEntityCommand",
                        id,
                    },
                    false,
                    false
                );
                break;
            }
            case "modifyEntityMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.modifyEntityMessage;
                this.mapEditorModeManager.executeCommand(
                    {
                        type: "UpdateEntityCommand",
                        dataToModify: data as EntityData,
                    },
                    false,
                    false
                );
                break;
            }
        }
    }

    private handleEntityUpdate(config: AtLeast<EntityData, "id">): void {
        const entity = this.entitiesManager.getEntities().find((entity) => entity.getEntityData().id === config.id);
        if (!entity) {
            return;
        }
        const { x: oldX, y: oldY } = entity.getOldPositionTopLeft();
        entity?.updateEntity(config);
        this.updateCollisionGrid(entity, oldX, oldY);
        this.scene.markDirty();
    }

    private handleEntityCreation(config: EntityData): void {
        void this.entitiesManager.addEntity(structuredClone(config));
    }

    private handleEntityDeletion(id: number): void {
        this.entitiesManager.deleteEntity(id);
    }

    private updateCollisionGrid(entity: Entity, oldX: number, oldY: number): void {
        const reversedGrid = entity.getReversedCollisionGrid();
        const grid = entity.getCollisionGrid();
        if (reversedGrid && grid) {
            this.scene.getGameMapFrontWrapper().modifyToCollisionsLayer(oldX, oldY, "0", reversedGrid);
            this.scene.getGameMapFrontWrapper().modifyToCollisionsLayer(
                entity.getTopLeft().x,
                entity.getTopLeft().y,
                "0",
                grid
            );
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
                                this.entityPrefabPreview = this.scene.add.image(0, 0, entityPrefab.imagePath);
                            }
                        })
                        .catch(() => {
                            console.error("COULD NOT LOAD THE ENTITY PREVIEW TEXTURE");
                        });
                }
                this.scene.markDirty();
            }
        );

        this.mapEntityEditorModeStoreUnsubscriber = mapEntityEditorModeStore.subscribe((mode) => {
            if (!get(mapEditorModeStore)) {
                return;
            }
            switch (mode) {
                case MapEntityEditorMode.AddMode: {
                    this.entitiesManager.makeAllEntitiesNonInteractive();
                    break;
                }
                case MapEntityEditorMode.EditMode: {
                    this.entitiesManager.makeAllEntitiesInteractive();
                    this.cleanPreview();
                    break;
                }
                case MapEntityEditorMode.RemoveMode: {
                    this.entitiesManager.makeAllEntitiesInteractive();
                    this.cleanPreview();
                    break;
                }
            }
        });
    }

    private bindEntitiesManagerEventHandlers(): void {
        this.entitiesManager.on(EntitiesManagerEvent.RemoveEntity, (entity: Entity) => {
            this.mapEditorModeManager.executeCommand({
                id: entity.getEntityData().id,
                type: "DeleteEntityCommand",
            });
        });
        this.entitiesManager.on(EntitiesManagerEvent.UpdateEntity, (entityData: AtLeast<EntityData, 'id'>) => {
            this.mapEditorModeManager.executeCommand({
                dataToModify: entityData,
                type: "UpdateEntityCommand",
            });
        });
    }

    private bindEventHandlers(): void {
        this.pointerMoveEventHandler = (pointer: Phaser.Input.Pointer) => {
            this.handlePointerMoveEvent(pointer);
        };
        this.pointerDownEventHandler = (pointer: Phaser.Input.Pointer) => {
            this.handlePointerDownEvent(pointer);
        };

        this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.pointerMoveEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
    }

    private unbindEventHandlers(): void {
        this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.pointerDownEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
    }

    private handlePointerMoveEvent(pointer: Phaser.Input.Pointer): void {
        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return
        }
        if (this.entityPrefab.collisionGrid) {
            const offsets = this.getPositionOffset(this.entityPrefab.collisionGrid);
            this.entityPrefabPreview.setPosition(
                Math.floor(pointer.worldX / 32) * 32 + offsets.x,
                Math.floor(pointer.worldY / 32) * 32 + offsets.y
            );
        } else {
            this.entityPrefabPreview.setPosition(Math.floor(pointer.worldX), Math.floor(pointer.worldY));
        }
        this.entityPrefabPreview.setDepth(
            this.entityPrefabPreview.y + this.entityPrefabPreview.displayHeight * 0.5
        );
        if (!this.scene.getGameMapFrontWrapper().canEntityBePlaced(
            this.entityPrefabPreview.getTopLeft(),
            this.entityPrefabPreview.displayWidth,
            this.entityPrefabPreview.displayHeight,
            this.entityPrefab.collisionGrid,
        )) {
            this.entityPrefabPreview.setTint(0xFF0000);
        } else {
            this.entityPrefabPreview.clearTint();
        }
        this.scene.markDirty();
    }

    private handlePointerDownEvent(pointer: Phaser.Input.Pointer): void {
        if (!this.entityPrefabPreview || !this.entityPrefab) {
            return
        }
        if (!this.scene.getGameMapFrontWrapper().canEntityBePlaced(
            this.entityPrefabPreview.getTopLeft(),
            this.entityPrefabPreview.displayWidth,
            this.entityPrefabPreview.displayHeight,
            this.entityPrefab.collisionGrid,
        )) {
            return;
        }
        if (pointer.rightButtonDown()) {
            this.cleanPreview();
            return;
        }
        let x = Math.floor(pointer.worldX);
        let y = Math.floor(pointer.worldY);

        if (this.entityPrefab.collisionGrid) {
            const offsets = this.getPositionOffset(this.entityPrefab.collisionGrid);
            x = Math.floor(pointer.worldX / 32) * 32 + offsets.x;
            y = Math.floor(pointer.worldY / 32) * 32 + offsets.y;
        }

        const entityData: EntityData = {
            x,
            y,
            id: this.gameMapEntities.getNextEntityId(),
            prefab: this.entityPrefab,
            properties: {},
        };
        this.mapEditorModeManager.executeCommand({
            entityData,
            type: "CreateEntityCommand",
        });
    }

    private cleanPreview(): void {
        this.entityPrefabPreview?.destroy();
        this.entityPrefabPreview = undefined;
        this.entityPrefab = undefined;
        this.scene.markDirty();
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
