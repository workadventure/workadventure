import { AreaData, EntityData, WAMEntityData } from "@workadventure/map-editor";
import * as Sentry from "@sentry/svelte";
import { EditMapCommandMessage } from "@workadventure/messages";
import { get, Unsubscriber } from "svelte/store";
import {
    mapEditorCopiedEntityDataPropertiesStore,
    mapEditorDeleteCustomEntityEventStore,
    mapEditorEntityModeStore,
    mapEditorEntityUploadEventStore,
    mapEditorModifyCustomEntityEventStore,
    mapEditorSelectedEntityStore,
} from "../../../../Stores/MapEditorStore";
import { Entity } from "../../../ECS/Entity";
import { TexturesHelper } from "../../../Helpers/TexturesHelper";
import { CopyEntityEventData, EntitiesManagerEvent } from "../../GameMap/EntitiesManager";
import { CreateEntityFrontCommand } from "../Commands/Entity/CreateEntityFrontCommand";
import { DeleteCustomEntityFrontCommand } from "../Commands/Entity/DeleteCustomEntityFrontCommand";
import { DeleteEntityFrontCommand } from "../Commands/Entity/DeleteEntityFrontCommand";
import { ModifyCustomEntityFrontCommand } from "../Commands/Entity/ModifyCustomEntityFrontCommand";
import { UpdateEntityFrontCommand } from "../Commands/Entity/UpdateEntityFrontCommand";
import { UploadEntityFrontCommand } from "../Commands/Entity/UploadEntityFrontCommand";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { TexturesHelper } from "../../../Helpers/TexturesHelper";
import {
    mapEditorCopiedEntityDataPropertiesStore,
    mapEditorEntityModeStore,
    mapEditorSelectedEntityStore,
} from "../../../../Stores/MapEditorStore";
import { AreaPreview } from "../../../Components/MapEditor/AreaPreview";
import { EntityRelatedEditorTool } from "./EntityRelatedEditorTool";

export class EntityEditorTool extends EntityRelatedEditorTool {
    /**
     * Visual representations of map Areas objects
     */
    protected areaPreviews: AreaPreview[] = [];

    protected ctrlKey?: Phaser.Input.Keyboard.Key;
    protected shiftKey?: Phaser.Input.Keyboard.Key;
    protected pointerMoveEventHandler!: (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) => void;
    protected pointerDownEventHandler!: (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) => void;

    protected mapEditorEntityUploadStoreUnsubscriber!: Unsubscriber;
    protected mapEditorModifyCustomEntityEventStoreUnsubscriber!: Unsubscriber;
    protected mapEditorDeleteCustomEntityEventStoreUnsubscriber!: Unsubscriber;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super(mapEditorModeManager);
        this.shiftKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.ctrlKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);

        this.bindEventHandlers();
        this.bindEntitiesManagerEventHandlers();
        this.subscribeToEntityUpload();
        this.subscribeToModifyCustomEntityEventStore();
        this.subscribeToDeleteCustomEntityEventStore();
    }

    public activate(): void {
        super.activate();
        this.createAreaPreviews();
        this.setAreaPreviewsVisibility(true);
    }

    public clear(): void {
        super.clear();
        this.setAreaPreviewsVisibility(false);
        this.deleteAreaPreview();
    }

    public destroy(): void {
        super.destroy();
        this.setAreaPreviewsVisibility(false);
        this.deleteAreaPreview();
    }

    /**
     * React on commands coming from the outside
     */
    public async handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        const commandId = editMapCommandMessage.id;
        switch (editMapCommandMessage.editMapMessage?.message?.$case) {
            case "createEntityMessage": {
                const createEntityMessage = editMapCommandMessage.editMapMessage?.message.createEntityMessage;
                const entityPrefab = await this.scene
                    .getEntitiesCollectionsManager()
                    .getEntityPrefab(createEntityMessage.collectionName, createEntityMessage.prefabId);

                if (!entityPrefab) {
                    console.warn(
                        `NO PREFAB WAS FOUND FOR: ${createEntityMessage.collectionName} ${createEntityMessage.prefabId}`
                    );
                    return;
                }

                TexturesHelper.loadEntityImage(this.scene, entityPrefab.imagePath, entityPrefab.imagePath)
                    .then(() => {
                        this.entitiesManager
                            .getEntities()
                            .get(createEntityMessage.id)
                            ?.setTexture(entityPrefab.imagePath);
                    })
                    .catch((reason) => {
                        console.warn(reason);
                    });

                const entityData: WAMEntityData = {
                    x: createEntityMessage.x,
                    y: createEntityMessage.y,
                    prefabRef: {
                        id: entityPrefab.id,
                        collectionName: entityPrefab.collectionName,
                    },
                    properties: createEntityMessage.properties,
                };
                // execute command locally
                await this.mapEditorModeManager.executeCommand(
                    new CreateEntityFrontCommand(
                        this.scene.getGameMap(),
                        createEntityMessage.id,
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
                const id = editMapCommandMessage.editMapMessage?.message.deleteEntityMessage.id;
                await this.mapEditorModeManager.executeCommand(
                    new DeleteEntityFrontCommand(this.scene.getGameMap(), id, commandId, this.entitiesManager),
                    false,
                    false
                );
                break;
            }
            case "modifyEntityMessage": {
                const modifyEntityMessage = editMapCommandMessage.editMapMessage?.message.modifyEntityMessage;
                await this.mapEditorModeManager.executeCommand(
                    new UpdateEntityFrontCommand(
                        this.scene.getGameMap(),
                        modifyEntityMessage.id,
                        {
                            ...modifyEntityMessage,
                            properties: modifyEntityMessage.modifyProperties
                                ? modifyEntityMessage.properties
                                : undefined,
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
            case "uploadEntityMessage": {
                const uploadEntityMessage = editMapCommandMessage.editMapMessage?.message.uploadEntityMessage;
                await this.mapEditorModeManager.executeCommand(
                    new UploadEntityFrontCommand(
                        uploadEntityMessage,
                        this.entitiesManager,
                        this.scene.getEntitiesCollectionsManager()
                    ),
                    false,
                    false
                );
                break;
            }
            case "modifyCustomEntityMessage": {
                const modifyCustomEntityMessage =
                    editMapCommandMessage.editMapMessage?.message.modifyCustomEntityMessage;
                await this.mapEditorModeManager.executeCommand(
                    new ModifyCustomEntityFrontCommand(
                        modifyCustomEntityMessage,
                        this.scene.getEntitiesCollectionsManager(),
                        this.scene.getGameMapFrontWrapper(),
                        this.entitiesManager
                    ),
                    false,
                    false
                );
                break;
            }
            case "deleteCustomEntityMessage": {
                const deleteCustomEntityMessage =
                    editMapCommandMessage.editMapMessage?.message.deleteCustomEntityMessage;
                await this.mapEditorModeManager.executeCommand(
                    new DeleteCustomEntityFrontCommand(
                        deleteCustomEntityMessage,
                        this.scene.getGameMap(),
                        this.entitiesManager,
                        this.scene.getEntitiesCollectionsManager()
                    ),
                    false,
                    false
                );
                break;
            }
        }
    }

    protected bindEntitiesManagerEventHandlers(): void {
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
            // Get Area from position of the entity object
            const areas = this.getAreasFromPosition(entityData.x, entityData.y);
            let areaId: string | undefined;
            if (areas && areas.length > 0) {
                const area = areas[0];
                areaId = area?.id;
            }

            // Create commande to update entity data
            this.mapEditorModeManager
                .executeCommand(
                    new UpdateEntityFrontCommand(
                        this.scene.getGameMap(),
                        entityData.id,
                        {
                            ...entityData,
                            areaId,
                        },
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
                areaId: data.areaId,
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

    protected bindEventHandlers() {
        this.pointerMoveEventHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) =>
            this.handlePointerMoveEvent(pointer, gameObjects);
        this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.pointerMoveEventHandler);

        this.pointerDownEventHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) =>
            this.handlePointerDownEvent(pointer, gameObjects);
        this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);

        this.shiftKey?.on(Phaser.Input.Keyboard.Events.DOWN, () => {
            this.changePreviewTint();
        });

        this.shiftKey?.on(Phaser.Input.Keyboard.Events.UP, () => {
            this.changePreviewTint();
        });
    }

    protected subscribeToEntityUpload() {
        this.mapEditorEntityUploadStoreUnsubscriber = mapEditorEntityUploadEventStore.subscribe(
            (uploadEntityMessage) => {
                if (uploadEntityMessage) {
                    (async () => {
                        await this.mapEditorModeManager.executeCommand(
                            new UploadEntityFrontCommand(
                                uploadEntityMessage,
                                this.entitiesManager,
                                this.scene.getEntitiesCollectionsManager()
                            )
                        );
                        mapEditorEntityUploadEventStore.set(undefined);
                    })().catch((e) => {
                        console.error(e);
                        Sentry.captureException(e);
                    });
                }
            }
        );
    }

    protected subscribeToModifyCustomEntityEventStore() {
        this.mapEditorModifyCustomEntityEventStoreUnsubscriber = mapEditorModifyCustomEntityEventStore.subscribe(
            (modifyCustomEntityMessage) => {
                if (modifyCustomEntityMessage) {
                    (async () => {
                        await this.mapEditorModeManager.executeCommand(
                            new ModifyCustomEntityFrontCommand(
                                modifyCustomEntityMessage,
                                this.scene.getEntitiesCollectionsManager(),
                                this.scene.getGameMapFrontWrapper(),
                                this.entitiesManager
                            )
                        );
                        mapEditorModifyCustomEntityEventStore.set(undefined);
                    })().catch((e) => {
                        console.error(e);
                        Sentry.captureException(e);
                    });
                }
            }
        );
    }

    protected subscribeToDeleteCustomEntityEventStore() {
        this.mapEditorDeleteCustomEntityEventStoreUnsubscriber = mapEditorDeleteCustomEntityEventStore.subscribe(
            (deleteCustomEntityMessage) => {
                if (deleteCustomEntityMessage) {
                    (async () => {
                        await this.mapEditorModeManager.executeCommand(
                            new DeleteCustomEntityFrontCommand(
                                deleteCustomEntityMessage,
                                this.scene.getGameMap(),
                                this.entitiesManager,
                                this.scene.getEntitiesCollectionsManager()
                            )
                        );
                        mapEditorDeleteCustomEntityEventStore.set(undefined);
                    })().catch((e) => {
                        console.error(e);
                        Sentry.captureException(e);
                    });
                }
            }
        );
    }

    protected handlePointerMoveEvent(
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ): void {
        // TODO: add shadow when moving into the area
        // .setDropShadow(4, 4, 0x000000);
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

    protected changePreviewTint(): void {
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
                    this.shiftKey?.isDown
                )
        ) {
            this.entityPrefabPreview.setTint(0xff0000);
        } else {
            if (this.shiftKey?.isDown) {
                this.entityPrefabPreview.setTint(0xffa500);
            } else {
                this.entityPrefabPreview.clearTint();
            }
        }
        this.scene.markDirty();
    }

    protected handlePointerDownEvent(
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ): void {
        if (get(mapEditorEntityModeStore) === "EDIT" && gameObjects.length === 0) {
            mapEditorEntityModeStore.set("ADD");
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
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
                    this.shiftKey?.isDown
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

        // Get the area and associate the object into the area
        let area: AreaData | undefined;
        if (gameObjects.length > 0 && gameObjects[0] instanceof AreaPreview) {
            area = gameObjects[0].getAreaData();
        }

        // If the area was not found by Phaser Pointer, we will try to find it by the position
        if (!area) {
            const areas = this.getAreasFromPosition(x, y);
            if (areas.length > 0) {
                area = areas[0];
            }
        }

        const entityData: WAMEntityData = {
            x: x - this.entityPrefabPreview.displayWidth * 0.5,
            y: y - this.entityPrefabPreview.displayHeight * 0.5,
            prefabRef: this.entityPrefab,
            properties: get(mapEditorCopiedEntityDataPropertiesStore) ?? [],
            areaId: area?.id,
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

    private unsubscribeStore() {
        this.mapEntityEditorModeStoreUnsubscriber();
        this.mapEditorModifyCustomEntityEventStoreUnsubscriber();
        this.mapEditorDeleteCustomEntityEventStoreUnsubscriber();
    }

    protected unbindEventHandlers(): void {
        this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.pointerMoveEventHandler);
        this.shiftKey?.off(Phaser.Input.Keyboard.Events.DOWN);
        this.shiftKey?.off(Phaser.Input.Keyboard.Events.UP);
        this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
    }

    public destroy() {
        super.destroy();
        this.unbindEventHandlers();
        this.unsubscribeStore();
    }

    protected createAreaPreviews(): AreaPreview[] {
        this.areaPreviews = [];
        const areaConfigs = this.scene.getGameMapFrontWrapper().getAreas();

        if (areaConfigs) {
            for (const config of Array.from(areaConfigs.values())) {
                this.createAreaPreview(config);
            }
        }

        this.setAreaPreviewsVisibility(false);

        return this.areaPreviews;
    }

    protected createAreaPreview(areaConfig: AreaData): AreaPreview {
        const areaPreview = new AreaPreview(this.scene, structuredClone(areaConfig), this.shiftKey, this.ctrlKey);
        this.areaPreviews.push(areaPreview);
        return areaPreview;
    }

    protected setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }

    protected deleteAreaPreview(): void {
        this.areaPreviews.forEach((preview) => preview.destroy());
    }

    protected getAreasFromPosition(x: number, y: number): AreaData[] {
        const areasPreview = this.scene.getGameMapFrontWrapper().getAreas();
        if (!areasPreview) {
            return [];
        }
        return Array.from(areasPreview.values()).filter((area: AreaData) => {
            return x >= area.x && x <= area.x + area.width && y >= area.y && y <= area.y + area.height;
        });
    }
}
