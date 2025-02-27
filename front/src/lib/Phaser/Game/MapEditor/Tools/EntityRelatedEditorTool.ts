import { EntityPrefab } from "@workadventure/map-editor";
import { get, Unsubscriber } from "svelte/store";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { GameScene } from "../../GameScene";
import { EntitiesManager } from "../../GameMap/EntitiesManager";
import {
    mapEditorCopiedEntityDataPropertiesStore,
    mapEditorEntityModeStore,
    mapEditorModeStore,
    mapEditorSelectedEntityDraggedStore,
    mapEditorSelectedEntityPrefabStore,
    mapEditorSelectedEntityStore,
    mapEditorVisibilityStore,
} from "../../../../Stores/MapEditorStore";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { TexturesHelper } from "../../../Helpers/TexturesHelper";
import { MapEditorTool } from "./MapEditorTool";

export abstract class EntityRelatedEditorTool extends MapEditorTool {
    protected scene: GameScene;
    protected mapEditorModeManager: MapEditorModeManager;

    protected entitiesManager: EntitiesManager;

    protected entityPrefab: EntityPrefab | undefined;
    protected entityPrefabPreview: Phaser.GameObjects.Image | undefined;
    protected entityOldPositionPreview: Phaser.GameObjects.Image | undefined;

    protected mapEditorSelectedEntityPrefabStoreUnsubscriber!: Unsubscriber;
    protected mapEntityEditorModeStoreUnsubscriber!: Unsubscriber;
    protected mapEditorSelectedEntityStoreUnsubscriber!: Unsubscriber;
    protected mapEditorSelectedEntityDraggedStoreUnsubscriber!: Unsubscriber;

    protected constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();

        this.entitiesManager = this.scene.getGameMapFrontWrapper().getEntitiesManager();

        this.entityPrefab = undefined;
        this.entityPrefabPreview = undefined;
        this.entityOldPositionPreview = undefined;

        this.subscribeToStores();
    }

    public update(time: number, dt: number): void {}

    public clear(): void {
        this.scene.input.topOnly = false;
        mapEditorEntityModeStore.set("ADD");
        this.entitiesManager.clearAllEntitiesTint();
        this.entitiesManager.clearAllEntitiesEditOutlines();
        this.cleanPreview();
    }

    public activate(): void {
        this.scene.input.topOnly = true;
        this.entitiesManager.makeAllEntitiesInteractive();
        mapEditorVisibilityStore.set(true);
    }

    public destroy(): void {
        this.cleanPreview();
        this.mapEditorSelectedEntityPrefabStoreUnsubscriber();
        this.mapEntityEditorModeStoreUnsubscriber();
        this.mapEditorSelectedEntityStoreUnsubscriber();
        this.mapEditorSelectedEntityDraggedStoreUnsubscriber();
    }

    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.info("EntityEditorTool subscribeToGameMapFrontWrapperEvents");
    }

    public handleKeyDownEvent(event: KeyboardEvent): void {
        switch (event.key.toLowerCase()) {
            case "escape": {
                if (get(mapEditorEntityModeStore) === "EDIT") {
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
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

    protected subscribeToStores(): void {
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

    protected cleanPreview(): void {
        this.entityPrefabPreview?.destroy();
        this.entityPrefabPreview = undefined;
        this.entityPrefab = undefined;
        mapEditorCopiedEntityDataPropertiesStore.set(undefined);
        mapEditorSelectedEntityPrefabStore.set(undefined);
        this.scene.markDirty();
    }

    protected getEntityPrefabAlignWithGridOffset(): { x: number; y: number } {
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
