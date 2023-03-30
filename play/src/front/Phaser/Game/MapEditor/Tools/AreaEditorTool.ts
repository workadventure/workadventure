import type { AreaData, AtLeast, CommandConfig } from "@workadventure/map-editor";
import type { Subscription } from "rxjs";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import type { EditMapCommandMessage } from "@workadventure/messages";
import { mapEditorAreaModeStore, mapEditorSelectedAreaPreviewStore } from "../../../../Stores/MapEditorStore";
import { AreaPreview, AreaPreviewEvent } from "../../../Components/MapEditor/AreaPreview";
import type { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import type { GameScene } from "../../GameScene";
import type { MapEditorModeManager } from "../MapEditorModeManager";
import { MapEditorTool } from "./MapEditorTool";

export class AreaEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    /**
     * Visual representations of map Areas objects
     */
    private areaPreviews: AreaPreview[];

    private gameMapAreaUpdateSubscription!: Subscription;

    private currentlySelectedPreview: AreaPreview | undefined;

    private active: boolean;

    private selectedAreaPreviewStoreSubscriber!: Unsubscriber;

    private pointerDownEventHandler!: (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) => void;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();

        this.areaPreviews = this.createAreaPreviews();
        this.active = false;

        this.subscribeToStores();
    }

    public update(time: number, dt: number): void {
        this.areaPreviews.forEach((preview) => preview.update(time, dt));
    }

    public clear(): void {
        this.active = false;
        mapEditorSelectedAreaPreviewStore.set(undefined);
        this.setAreaPreviewsVisibility(false);
        this.unbindEventHandlers();
    }

    public activate(): void {
        this.active = true;
        this.updateAreaPreviews();
        this.setAreaPreviewsVisibility(true);
        this.bindEventHandlers();
        this.scene.markDirty();
    }

    public destroy(): void {
        this.gameMapAreaUpdateSubscription.unsubscribe();
        this.selectedAreaPreviewStoreSubscriber();
        this.unbindEventHandlers();
    }

    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): void {
        const commandId = editMapCommandMessage.id;
        switch (editMapCommandMessage.editMapMessage?.message?.$case) {
            case "modifyAreaMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.modifyAreaMessage;
                // execute command locally
                this.mapEditorModeManager.executeCommand(
                    {
                        type: "UpdateAreaCommand",
                        dataToModify: data as AreaData,
                    },
                    false,
                    false,
                    commandId
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
                this.mapEditorModeManager.executeCommand(
                    {
                        type: "CreateAreaCommand",
                        areaObjectConfig: config,
                    },
                    false,
                    false,
                    commandId
                );
                break;
            }
            case "deleteAreaMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.deleteAreaMessage;
                // execute command locally
                this.mapEditorModeManager.executeCommand(
                    {
                        type: "DeleteAreaCommand",
                        id: data.id,
                    },
                    false,
                    false,
                    commandId
                );
                break;
            }
        }
    }

    public handleCommandExecution(commandConfig: CommandConfig, localCommand: boolean): void {
        // We do not need to make any visual changes if AreaEditorTool is not active
        if (!this.active) {
            return;
        }
        switch (commandConfig.type) {
            case "CreateAreaCommand": {
                this.handleAreaPreviewCreation(commandConfig.areaObjectConfig);
                break;
            }
            case "DeleteAreaCommand": {
                this.handleAreaPreviewDeletion(commandConfig.id);
                break;
            }
            case "UpdateAreaCommand": {
                this.handleAreaPreviewUpdate(commandConfig.dataToModify);
                break;
            }
            default: {
                break;
            }
        }
    }

    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        this.gameMapAreaUpdateSubscription = gameMapFrontWrapper
            .getAreaUpdatedObservable()
            .subscribe((areaConfig: AreaData) => {
                this.updateAreaPreview(areaConfig);
                this.scene.markDirty();
            });
    }

    public updateAreaPreview(config: AreaData): void {
        const areaPreview = this.getAreaPreview(config.id);
        if (!areaPreview) {
            return;
        }
        areaPreview.updatePreview(config);
        // // HACK: A way to update AreaPreviewWindow component values after performin undo / redo operations
        // if (get(mapEditorSelectedAreaPreviewStore) !== undefined) {
        //     mapEditorSelectedAreaPreviewStore.set(areaPreview);
        // }
    }

    public getAreaPreviewConfig(id: string): AreaData | undefined {
        return this.getAreaPreview(id)?.getAreaData();
    }

    public handleKeyDownEvent(event: KeyboardEvent): void {
        switch (event.key.toLowerCase()) {
            case "delete": {
                const areaPreview = get(mapEditorSelectedAreaPreviewStore);
                if (!areaPreview) {
                    break;
                }
                this.mapEditorModeManager.executeCommand({
                    type: "DeleteAreaCommand",
                    id: areaPreview.getId(),
                });
                break;
            }
            case "l": {
                const id = crypto.randomUUID();
                this.mapEditorModeManager.executeCommand({
                    type: "CreateAreaCommand",
                    areaObjectConfig: {
                        id,
                        name: `STATIC_AREA_${id}`,
                        visible: true,
                        properties: {
                            focusable: {
                                zoom_margin: 0.5,
                            },
                            jitsiRoom: {
                                roomName: "elomelo",
                                jitsiRoomConfig: {},
                            },
                        },
                        width: 100,
                        height: 100,
                        x: this.scene.input.activePointer.worldX - 50,
                        y: this.scene.input.activePointer.worldY - 50,
                    },
                });
                break;
            }
            default: {
                break;
            }
        }
    }

    private bindEventHandlers(): void {
        this.pointerDownEventHandler = (
            pointer: Phaser.Input.Pointer,
            gameObjects: Phaser.GameObjects.GameObject[]
        ) => {
            this.handlePointerDownEvent(pointer, gameObjects);
        };

        this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
    }

    private unbindEventHandlers(): void {
        this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.pointerDownEventHandler);
    }

    private handlePointerDownEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        if (get(mapEditorAreaModeStore) === "EDIT" && gameObjects.length === 0) {
            mapEditorAreaModeStore.set("ADD");
            mapEditorSelectedAreaPreviewStore.set(undefined);
        }
    }

    private handleAreaPreviewDeletion(id: string): void {
        this.deleteAreaPreview(id);
        this.scene.markDirty();
        mapEditorSelectedAreaPreviewStore.set(undefined);
    }

    private handleAreaPreviewCreation(config: AreaData): void {
        const areaPreview = new AreaPreview(this.scene, structuredClone(config));
        this.bindAreaPreviewEventHandlers(areaPreview);
        this.areaPreviews.push(areaPreview);
        this.scene.markDirty();
    }

    private handleAreaPreviewUpdate(config: AtLeast<AreaData, "id">): void {
        this.areaPreviews.find((area) => area.getAreaData().id === config.id)?.updatePreview(config);
        this.scene.getGameMapFrontWrapper().updateArea(config.id, config);
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
                this.areaPreviews.push(this.createAreaPreview(config));
            }
        }

        this.setAreaPreviewsVisibility(false);

        return this.areaPreviews;
    }

    private createAreaPreview(areaConfig: AreaData): AreaPreview {
        const areaPreview = new AreaPreview(this.scene, { ...areaConfig });
        this.bindAreaPreviewEventHandlers(areaPreview);
        return areaPreview;
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

    private bindAreaPreviewEventHandlers(areaPreview: AreaPreview): void {
        areaPreview.on(AreaPreviewEvent.Clicked, () => {
            mapEditorAreaModeStore.set("EDIT");
            mapEditorSelectedAreaPreviewStore.set(areaPreview);
        });
        areaPreview.on(AreaPreviewEvent.Update, (data: AtLeast<AreaData, "id">) => {
            this.mapEditorModeManager.executeCommand({
                type: "UpdateAreaCommand",
                dataToModify: data,
            });
        });
        areaPreview.on(AreaPreviewEvent.Delete, () => {
            this.mapEditorModeManager.executeCommand({
                type: "DeleteAreaCommand",
                id: areaPreview.getAreaData().id,
            });
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
                    this.areaPreviews.push(this.createAreaPreview(config));
                }
            }
        }
    }

    private setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }
}
