import { AreaData, AtLeast } from "@workadventure/map-editor";
import type { EditMapCommandMessage } from "@workadventure/messages";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import { v4 as uuid } from "uuid";
import { openModal } from "svelte-modals";
import {
    mapEditorAreaModeStore,
    MapEditorAreaToolMode,
    mapEditorSelectedAreaPreviewStore,
} from "../../../../Stores/MapEditorStore";
import { AreaPreview, AreaPreviewEvent } from "../../../Components/MapEditor/AreaPreview";
import { SizeAlteringSquare } from "../../../Components/MapEditor/SizeAlteringSquare";
import { CopyAreaEventData } from "../../GameMap/EntitiesManager";
import type { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import type { GameScene } from "../../GameScene";
import { CreateAreaFrontCommand } from "../Commands/Area/CreateAreaFrontCommand";
import { DeleteAreaFrontCommand } from "../Commands/Area/DeleteAreaFrontCommand";
import { UpdateAreaFrontCommand } from "../Commands/Area/UpdateAreaFrontCommand";
import type { MapEditorModeManager } from "../MapEditorModeManager";
import { Entity } from "../../../ECS/Entity";
import { DeleteEntityFrontCommand } from "../Commands/Entity/DeleteEntityFrontCommand";
import ActionPopupOnPersonalAreaWithEntities from "../../../../Components/MapEditor/ActionPopupOnPersonalAreaWithEntities.svelte";
import { MapEditorTool } from "./MapEditorTool";
import { TrashEditorTool } from "./TrashEditorTool";

export class AreaEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    /**
     * Visual representations of map Areas objects
     */
    private areaPreviews: AreaPreview[] = [];
    private currentlySelectedPreview: AreaPreview | undefined;

    private active: boolean;

    private drawingNewArea: boolean;
    private drawinNewAreaStartPos?: { x: number; y: number };
    private newAreaPreview!: Phaser.GameObjects.Graphics;
    private areaOldPositionPreview!: Phaser.GameObjects.Graphics;

    private draggingdArea: boolean;
    private wasAreaMoved: boolean;

    private shiftKey?: Phaser.Input.Keyboard.Key;
    private ctrlKey?: Phaser.Input.Keyboard.Key;

    private selectedAreaPreviewStoreSubscriber!: Unsubscriber;

    private pointerMoveEventHandler!: (pointer: Phaser.Input.Pointer) => void;
    private pointerUpEventHandler!: (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) => void;

    private pointerDownEventHandler!: (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) => void;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();

        this.shiftKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.ctrlKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);

        this.active = false;
        this.drawingNewArea = false;

        this.draggingdArea = false;
        this.wasAreaMoved = false;

        this.drawinNewAreaStartPos = undefined;

        this.newAreaPreview = this.scene.add.graphics();
        this.areaOldPositionPreview = this.scene.add.graphics();

        this.subscribeToStores();
    }

    public update(time: number, dt: number): void {
        this.areaPreviews.forEach((preview) => preview.update(time, dt));
    }

    public clear(): void {
        this.active = false;
        this.drawingNewArea = false;
        this.draggingdArea = false;
        this.wasAreaMoved = false;
        this.drawinNewAreaStartPos = undefined;
        mapEditorSelectedAreaPreviewStore.set(undefined);
        this.setAreaPreviewsVisibility(false);
        this.scene.input.setDefaultCursor("auto");
        this.unbindEventHandlers();
        this.scene.markDirty();
    }

    public activate(): void {
        this.areaPreviews = this.createAreaPreviews();
        this.active = true;
        this.scene.input.setTopOnly(false);
        this.updateAreaPreviews();
        this.setAreaPreviewsVisibility(true);
        this.bindEventHandlers();
        this.changeAreaMode("ADD");
        this.scene.markDirty();
    }

    public destroy(): void {
        this.areaPreviews.forEach((preview) => preview.destroy());
        this.selectedAreaPreviewStoreSubscriber();
        this.unbindEventHandlers();
        this.scene.input.setDefaultCursor("auto");
    }

    public async handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        const commandId = editMapCommandMessage.id;
        switch (editMapCommandMessage.editMapMessage?.message?.$case) {
            case "modifyAreaMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.modifyAreaMessage;
                // execute command locally
                await this.mapEditorModeManager.executeLocalCommand(
                    new UpdateAreaFrontCommand(
                        this.scene.getGameMap(),
                        {
                            ...data,
                            properties: data.modifyProperties ? data.properties : undefined,
                        },
                        commandId,
                        undefined,
                        this,
                        this.scene.getGameMapFrontWrapper()
                    )
                );
                break;
            }
            case "createAreaMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.createAreaMessage;
                const config: AreaData = {
                    ...data,
                    visible: true,
                };
                // execute command locally
                await this.mapEditorModeManager.executeLocalCommand(
                    new CreateAreaFrontCommand(
                        this.scene.getGameMap(),
                        config,
                        commandId,
                        this,
                        false,
                        this.scene.getGameMapFrontWrapper()
                    )
                );
                break;
            }
            case "deleteAreaMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.deleteAreaMessage;
                // execute command locally
                await this.mapEditorModeManager.executeLocalCommand(
                    new DeleteAreaFrontCommand(
                        this.scene.getGameMap(),
                        data.id,
                        commandId,
                        this,
                        this.scene.getGameMapFrontWrapper()
                    )
                );
                break;
            }
        }
    }

    public handleDeleteAreaFrontCommandExecution(areaId: string, editorTool?: AreaEditorTool | TrashEditorTool): void {
        const isPersonalArea = this.getIsPersonalArea(areaId);
        const deleteAreaCommand = new DeleteAreaFrontCommand(
            this.scene.getGameMap(),
            areaId,
            undefined,
            editorTool ?? this,
            this.scene.getGameMapFrontWrapper()
        );
        if (isPersonalArea) {
            const entitiesInsideArea = this.getEntitiesInsideArea(areaId);
            if (entitiesInsideArea.size > 0) {
                openModal(ActionPopupOnPersonalAreaWithEntities, {
                    onDeleteEntities: () => this.executeDeletePersonalAreaWithEntities(areaId, deleteAreaCommand, true),
                    onKeepEntities: () => this.executeDeletePersonalAreaWithEntities(areaId, deleteAreaCommand),
                    onCancel: () => {},
                });
                return;
            }
        }
        this.mapEditorModeManager.executeCommand(deleteAreaCommand).catch((error) => console.error(error));
    }

    private getIsPersonalArea(areaId: string): boolean {
        return !!this.scene.getGameMap().getGameMapAreas()?.isPersonalArea(areaId);
    }

    private getEntitiesInsideArea(areaId: string): Map<string, Entity> {
        const entitiesManager = this.scene.getGameMapFrontWrapper().getEntitiesManager();
        return entitiesManager.getEntitiesInsideArea(areaId);
    }

    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {}

    public getAreaPreviewConfig(id: string): AreaData | undefined {
        return this.getAreaPreview(id)?.getAreaData();
    }

    public handleKeyDownEvent(event: KeyboardEvent): void {
        switch (event.key.toLowerCase()) {
            case "backspace":
            case "delete": {
                const areaPreview = get(mapEditorSelectedAreaPreviewStore);
                if (!areaPreview) {
                    break;
                }
                this.handleDeleteAreaFrontCommandExecution(areaPreview.getId());
                this.changeAreaMode("ADD");
                break;
            }
            default: {
                break;
            }
        }
    }

    private bindEventHandlers(): void {
        this.pointerMoveEventHandler = (pointer: Phaser.Input.Pointer) => {
            this.handlePointerMoveEvent(pointer);
        };
        this.pointerUpEventHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
            this.handlePointerUpEvent(pointer, gameObjects);
        };
        this.pointerDownEventHandler = (
            pointer: Phaser.Input.Pointer,
            gameObjects: Phaser.GameObjects.GameObject[]
        ) => {
            this.handlePointerDownEvent(pointer, gameObjects);
        };

        this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.pointerUpEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_OVER, this.pointerHoverEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.pointerMoveEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_OUT, this.pointerOutEventHandler);

        this.shiftKey?.on(Phaser.Input.Keyboard.Events.DOWN, () => {
            if (this.drawingNewArea && this.drawinNewAreaStartPos) {
                this.drawNewArea(this.scene.input.activePointer);
            }
        });

        this.shiftKey?.on(Phaser.Input.Keyboard.Events.UP, () => {
            if (this.drawingNewArea && this.drawinNewAreaStartPos) {
                this.drawNewArea(this.scene.input.activePointer);
            }
        });
        this.ctrlKey?.on(Phaser.Input.Keyboard.Events.DOWN, () => {
            this.scene.input.setDefaultCursor("crosshair");
        });
        this.ctrlKey?.on(Phaser.Input.Keyboard.Events.UP, () => {
            this.scene.input.setDefaultCursor("grab");
        });
    }

    private unbindEventHandlers(): void {
        this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.pointerUpEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_OVER, this.pointerHoverEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.pointerMoveEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_OUT, this.pointerOutEventHandler);
    }

    private pointerHoverEventHandler = (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) => {
        if (!this.active) {
            return;
        }
        const areaEditorToolObjects = this.getAreaEditorToolObjectsFromGameObjects(gameObjects);
        if (areaEditorToolObjects.length === 1) {
            if (this.isAreaPreview(areaEditorToolObjects[0])) {
                this.scene.input.setDefaultCursor("grab");
            }
        }
    };

    private pointerOutEventHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
        if (!this.active) {
            return;
        }
        const areaEditorToolObjects = this.getAreaEditorToolObjectsFromGameObjects(gameObjects);
        if (areaEditorToolObjects.length === 1) {
            if (this.isAreaPreview(areaEditorToolObjects[0])) {
                this.scene.input.setDefaultCursor("crosshair");
            }
        }
    };

    private handlePointerDownEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        const areaEditorToolObjects = this.getAreaEditorToolObjectsFromGameObjects(gameObjects);
        if (pointer.rightButtonDown()) {
            return;
        }
        const mode = get(mapEditorAreaModeStore);

        if (areaEditorToolObjects.length === 0) {
            this.draggingdArea = false;
            this.wasAreaMoved = false;

            if (mode === "ADD") {
                this.drawingNewArea = true;
                this.drawinNewAreaStartPos = { x: pointer.worldX, y: pointer.worldY };
                return;
            }
            if (mode === "EDIT") {
                this.changeAreaMode("ADD");
                this.drawingNewArea = true;
                this.drawinNewAreaStartPos = { x: pointer.worldX, y: pointer.worldY };
                return;
            }
            return;
        }

        if (areaEditorToolObjects.length === 1) {
            if (this.isAreaPreview(areaEditorToolObjects[0])) {
                this.changeAreaMode("EDIT", areaEditorToolObjects[0]);
                this.scene.input.setDefaultCursor("grabbing");
                this.wasAreaMoved = true;
            }
        }
    }

    private handlePointerUpEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        const mode = get(mapEditorAreaModeStore);
        const sortedAreaPreviews = gameObjects
            .filter((obj) => this.isAreaPreview(obj))
            .sort((a1, a2) => {
                return a1.getSize() - a2.getSize();
            });

        if (mode === "ADD") {
            if (this.drawinNewAreaStartPos) {
                const drawingData = this.getNewAreaDrawingData(pointer);

                if (drawingData.width >= 10 && drawingData.height >= 10) {
                    this.createNewArea(drawingData.x, drawingData.y, drawingData.width, drawingData.height);
                }
                this.drawinNewAreaStartPos = undefined;
                this.drawingNewArea = false;
                this.newAreaPreview.clear();
                this.scene.markDirty();
                return;
            }
            this.changeAreaMode("EDIT", sortedAreaPreviews[0]);
        } else if (mode === "EDIT") {
            const currentlySelectedArea = get(mapEditorSelectedAreaPreviewStore);

            for (const obj of gameObjects) {
                if (this.isSizeAlteringSquare(obj)) {
                    this.draggingdArea = false;
                    this.wasAreaMoved = false;
                    return;
                }
            }

            if (currentlySelectedArea) {
                if (!sortedAreaPreviews.includes(currentlySelectedArea)) {
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                    mapEditorSelectedAreaPreviewStore.set(sortedAreaPreviews[0]);
                } else {
                    if (this.wasAreaMoved) {
                        this.draggingdArea = false;
                        this.wasAreaMoved = false;
                        this.scene.input.setDefaultCursor("grab");
                    } else {
                        const nextAreaIndex =
                            (sortedAreaPreviews.indexOf(currentlySelectedArea) + 1) % sortedAreaPreviews.length;
                        if (document.activeElement instanceof HTMLElement) {
                            document.activeElement.blur();
                        }
                        mapEditorSelectedAreaPreviewStore.set(sortedAreaPreviews[nextAreaIndex]);
                    }
                }
                // can happen after we delete an Area
            } else {
                if (sortedAreaPreviews.length > 0) {
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                    mapEditorSelectedAreaPreviewStore.set(sortedAreaPreviews[0]);
                }
            }
        }
    }

    private handlePointerMoveEvent(pointer: Phaser.Input.Pointer): void {
        if (this.drawingNewArea && this.drawinNewAreaStartPos) {
            this.drawNewArea(pointer);
        }
        if (this.draggingdArea) {
            this.wasAreaMoved = true;
        }
    }

    private drawNewArea(pointer: Phaser.Input.Pointer): void {
        const drawingData = this.getNewAreaDrawingData(pointer);
        this.newAreaPreview.clear();
        this.newAreaPreview.fillStyle(0x0000ff, 0.5);
        this.newAreaPreview.fillRect(drawingData.x, drawingData.y, drawingData.width, drawingData.height);
        this.scene.markDirty();
    }

    private drawAreaOldPositionPreview(x: number, y: number, width: number, height: number): void {
        this.areaOldPositionPreview.clear();
        this.areaOldPositionPreview.fillStyle(0x0000ff, 0.25);
        this.areaOldPositionPreview.fillRect(x, y, width, height);
        this.scene.markDirty();
    }

    private getNewAreaDrawingData(pointer: Phaser.Input.Pointer): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        if (!this.drawinNewAreaStartPos) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }
        const width = Math.abs(pointer.worldX - this.drawinNewAreaStartPos.x);
        const height = Math.abs(pointer.worldY - this.drawinNewAreaStartPos.y);
        const x = Math.min(this.drawinNewAreaStartPos.x, pointer.worldX);
        const y = Math.min(this.drawinNewAreaStartPos.y, pointer.worldY);
        if (this.shiftKey?.isDown) {
            return {
                x: Math.floor(x / 32) * 32,
                y: Math.floor(y / 32) * 32,
                width: Math.floor(width / 32) * 32 + 32,
                height: Math.floor(height / 32) * 32 + 32,
            };
        }
        return {
            x,
            y,
            width,
            height,
        };
    }

    private getAreaEditorToolObjectsFromGameObjects(
        gameObjects: Phaser.GameObjects.GameObject[]
    ): (AreaPreview | SizeAlteringSquare)[] {
        const areaPreviews = gameObjects.filter((obj) => this.isAreaPreview(obj));
        const sizeAlteringSquares = gameObjects.filter((obj) => this.isSizeAlteringSquare(obj));
        return [...areaPreviews, ...sizeAlteringSquares];
    }

    private changeAreaMode(mode: MapEditorAreaToolMode, areaPreview?: AreaPreview): void {
        mapEditorAreaModeStore.set(mode);
        this.scene.input.setDefaultCursor("crosshair");
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        mapEditorSelectedAreaPreviewStore.set(areaPreview);
    }

    public handleAreaDeletion(id: string, areaData: AreaData | undefined): void {
        this.scene.getGameMapFrontWrapper().listenAreaDeletion(areaData);

        if (!this.active) {
            return;
        }

        this.deleteAreaPreview(id);
        this.scene.markDirty();
        mapEditorSelectedAreaPreviewStore.set(undefined);
    }

    public handleAreaCreation(config: AreaData, localCommand: boolean): void {
        this.scene.getGameMapFrontWrapper().listenAreaCreation(config);

        if (!this.active) {
            return;
        }

        const areaPreview = this.createAreaPreview(config);
        this.scene.markDirty();

        if (localCommand) {
            this.changeAreaMode("EDIT", areaPreview);
        }
    }

    public handleAreaUpdate(oldConfig: AtLeast<AreaData, "id">, newConfig: AtLeast<AreaData, "id">): void {
        this.scene.getGameMapFrontWrapper().listenAreaChanges(oldConfig, newConfig);

        if (!this.active) {
            return;
        }

        const area = this.areaPreviews.find((area) => area.getAreaData().id === newConfig.id);

        if (area) {
            area.updatePreview(newConfig);
            mapEditorSelectedAreaPreviewStore.set(area);
        }

        this.scene.markDirty();
    }

    private getAreaPreview(id: string): AreaPreview | undefined {
        return this.areaPreviews.find((area) => area.getId() === id);
    }

    private createAreaPreviews(): AreaPreview[] {
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

    private createAreaPreview(areaConfig: AreaData): AreaPreview {
        const areaPreview = new AreaPreview(this.scene, structuredClone(areaConfig), this.shiftKey, this.ctrlKey);
        this.bindAreaPreviewEventHandlers(areaPreview);
        this.areaPreviews.push(areaPreview);
        return areaPreview;
    }

    private copyArea(data: CopyAreaEventData): void {
        const id = uuid();
        this.mapEditorModeManager
            .executeCommand(
                new CreateAreaFrontCommand(
                    this.scene.getGameMap(),
                    {
                        id,
                        name: data.name,
                        visible: true,
                        properties: data.properties ?? [],
                        width: data.width,
                        height: data.height,
                        x: data.position.x,
                        y: data.position.y,
                    },
                    undefined,
                    this,
                    true,
                    this.scene.getGameMapFrontWrapper()
                )
            )
            .catch((e) => console.error(e));
    }

    private createNewArea(x: number, y: number, width: number, height: number): void {
        const id = uuid();
        this.mapEditorModeManager
            .executeCommand(
                new CreateAreaFrontCommand(
                    this.scene.getGameMap(),
                    {
                        id,
                        name: "",
                        visible: true,
                        properties: [],
                        width,
                        height,
                        x,
                        y,
                    },
                    undefined,
                    this,
                    true,
                    this.scene.getGameMapFrontWrapper()
                )
            )
            .catch((e) => console.error(e));
    }

    private deleteAreaPreview(id: string): boolean {
        const index = this.areaPreviews.findIndex((preview) => preview.getAreaData().id === id);
        if (index !== -1) {
            this.areaPreviews.splice(index, 1)[0].destroy();
            return true;
        }
        return false;
    }

    private subscribeToStores(): void {
        this.selectedAreaPreviewStoreSubscriber = mapEditorSelectedAreaPreviewStore.subscribe(
            (preview: AreaPreview | undefined) => {
                this.currentlySelectedPreview?.select(false);
                this.currentlySelectedPreview = preview;
                if (this.currentlySelectedPreview) {
                    this.currentlySelectedPreview?.select(true);
                }
                this.scene.markDirty();
            }
        );
    }

    private executeDeletePersonalAreaWithEntities(
        areaId: string,
        deleteAreaCommand: DeleteAreaFrontCommand,
        removeEntities?: boolean
    ): void {
        if (removeEntities) {
            this.removeAreaEntities(areaId);
        }
        this.mapEditorModeManager.executeCommand(deleteAreaCommand).catch((error) => console.error(error));
    }

    private executeUpdateAreaFrontCommand(
        newData: AtLeast<AreaData, "id">,
        oldData: AtLeast<AreaData, "id"> | undefined,
        removeEntities?: boolean
    ): void {
        const gameMap = this.scene.getGameMap();
        if (removeEntities) {
            this.removeAreaEntities(newData.id);
        }
        this.mapEditorModeManager
            .executeCommand(
                new UpdateAreaFrontCommand(
                    gameMap,
                    newData,
                    undefined,
                    oldData,
                    this,
                    this.scene.getGameMapFrontWrapper()
                )
            )
            .catch((error) => console.error(error));
    }

    private removeAreaEntities(areaId: string): void {
        const gameMap = this.scene.getGameMap();
        const entitiesManager = this.scene.getGameMapFrontWrapper().getEntitiesManager();
        const entitiesInsideArea = this.getEntitiesInsideArea(areaId);
        entitiesInsideArea.forEach((_, entityId) => {
            this.mapEditorModeManager
                .executeCommand(new DeleteEntityFrontCommand(gameMap, entityId, undefined, entitiesManager))
                .catch((error) => console.error(error));
        });
    }

    private bindAreaPreviewEventHandlers(areaPreview: AreaPreview): void {
        areaPreview.on(AreaPreviewEvent.DragStart, () => {
            this.draggingdArea = true;
            const areaData = areaPreview.getAreaData();
            this.drawAreaOldPositionPreview(areaData.x, areaData.y, areaData.width, areaData.height);
            areaPreview.destroyText();
        });
        areaPreview.on(AreaPreviewEvent.Released, () => {
            this.draggingdArea = false;
            this.areaOldPositionPreview.clear();
        });
        areaPreview.on(AreaPreviewEvent.Copied, (data: CopyAreaEventData) => {
            this.copyArea(data);
        });
        areaPreview.on(
            AreaPreviewEvent.Updated,
            (
                newData: AtLeast<AreaData, "id">,
                oldData: AtLeast<AreaData, "id"> | undefined,
                removeAreaEntities: boolean | undefined
            ) => {
                this.executeUpdateAreaFrontCommand(newData, oldData, removeAreaEntities);
                areaPreview.playText();
            }
        );
        areaPreview.on(AreaPreviewEvent.Delete, () => {
            this.handleDeleteAreaFrontCommandExecution(areaPreview.getId());
        });
        areaPreview.on(AreaPreviewEvent.UpdateVisibility, (visibility: boolean) => {
            if (!visibility) {
                this.areaOldPositionPreview.clear();
                areaPreview.destroyText();
            }
        });
    }

    private updateAreaPreviews(): void {
        const areaConfigs = this.scene.getGameMapFrontWrapper().getAreas();

        // find previews of areas that exist no longer
        const areaPreviewsToDelete: string[] = [];
        for (const preview of this.areaPreviews) {
            if (!areaConfigs?.has(preview.getId())) {
                areaPreviewsToDelete.push(preview.getId());
            }
        }
        // destroy them
        for (const id of areaPreviewsToDelete) {
            const index = this.areaPreviews.findIndex((preview) => preview.getId() === id);
            if (index !== -1) {
                this.areaPreviews.splice(index, 1)[0]?.destroy();
            }
        }

        // create previews for new areas that were created during our absence in editor mode
        if (areaConfigs) {
            for (const config of Array.from(areaConfigs.values())) {
                const areaPreview = this.areaPreviews.find((areaPreview) => areaPreview.getId() === config.id);
                if (areaPreview) {
                    areaPreview.updatePreview(config);
                } else {
                    this.createAreaPreview(config);
                }
            }
        }
    }

    private setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }

    private isAreaPreview(obj: Phaser.GameObjects.GameObject): obj is AreaPreview {
        return obj instanceof AreaPreview;
    }

    private isSizeAlteringSquare(obj: Phaser.GameObjects.GameObject): obj is SizeAlteringSquare {
        return obj instanceof SizeAlteringSquare;
    }
}
