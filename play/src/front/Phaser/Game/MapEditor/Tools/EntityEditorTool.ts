import { CommandConfig, EntityData, EntityPrefab } from "@workadventure/map-editor";
import { GameMapEntities } from "@workadventure/map-editor/src/GameMap/GameMapEntities";
import { EditMapCommandMessage } from "@workadventure/messages";
import { get, Unsubscriber } from "svelte/store";
import {
    mapEditorModeStore,
    mapEditorSelectedEntityPrefabStore,
    MapEntityEditorMode,
    mapEntityEditorModeStore,
} from "../../../../Stores/MapEditorStore";
import { Entity } from "../../../ECS/Entity";
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

    private pointerMoveEventHandler: (pointer: Phaser.Input.Pointer) => void;
    private pointerDownEventHandler: (pointer: Phaser.Input.Pointer) => void;

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
        console.log("EntityEditorTool handleIncomingCommandMessage");
    }

    private handleEntityCreation(config: EntityData): void {
        this.entitiesManager.addEntity(structuredClone(config));
    }

    private handleEntityDeletion(id: number): void {
        this.entitiesManager.deleteEntity(id);
        this.gameMapEntities.deleteEntity(id);
    }

    private subscribeToStores(): void {
        this.mapEditorSelectedEntityPrefabStoreUnsubscriber = mapEditorSelectedEntityPrefabStore.subscribe(
            (entityPrefab: EntityPrefab | undefined): void => {
                this.entityPrefab = entityPrefab;
                if (!entityPrefab) {
                    this.entityPrefabPreview?.destroy();
                    this.entityPrefabPreview = undefined;
                } else {
                    this.loadEntityImage(entityPrefab.imagePath, `${entityPrefab.imagePath}`)
                        .then(() => {
                            if (this.entityPrefabPreview) {
                                this.entityPrefabPreview.setTexture(entityPrefab.imagePath);
                            } else {
                                this.entityPrefabPreview = this.scene.add.image(300, 300, entityPrefab.imagePath);
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
    }

    private async loadEntityImage(key: string, url: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.scene.textures.exists(key)) {
                resolve();
            }
            this.scene.load.once(`filecomplete-image-${url}`, () => {
                resolve();
            });
            this.scene.load.image(key, url);
            this.scene.load.start();
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
        if (this.entityPrefabPreview && this.entityPrefab) {
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
            this.scene.markDirty();
        }
    }

    private handlePointerDownEvent(pointer: Phaser.Input.Pointer): void {
        if (pointer.rightButtonDown()) {
            this.cleanPreview();
        }
        if (this.entityPrefabPreview && this.entityPrefab) {
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
                interactive: true,
                properties:[]
            };
            this.mapEditorModeManager.executeCommand({
                entityData,
                type: "CreateEntityCommand",
            });
        }
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
