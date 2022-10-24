import { AreaData, AreaType, CommandConfig } from "@workadventure/map-editor";
import { Subscription } from "rxjs";
import { get, Unsubscriber } from "svelte/store";
import { EditMapCommandMessage } from "@workadventure/messages";
import { mapEditorSelectedAreaPreviewStore, mapEditorSelectedPropertyStore } from "../../../../Stores/MapEditorStore";
import { AreaPreview, AreaPreviewEvent } from "../../../Components/MapEditor/AreaPreview";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
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

    private selectedAreaPreviewStoreSubscriber!: Unsubscriber;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();

        this.areaPreviews = this.createAreaPreviews();

        this.subscribeToStores();
    }

    public update(time: number, dt: number): void {
        this.areaPreviews.forEach((preview) => preview.update(time, dt));
    }

    public clear(): void {
        mapEditorSelectedAreaPreviewStore.set(undefined);
        mapEditorSelectedPropertyStore.set(undefined);
        this.setAreaPreviewsVisibility(false);
    }

    public activate(): void {
        this.updateAreaPreviews();
        this.setAreaPreviewsVisibility(true);
        this.scene.markDirty();
    }

    public destroy(): void {
        this.gameMapAreaUpdateSubscription.unsubscribe();
        this.selectedAreaPreviewStoreSubscriber();
    }

    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): void {
        switch (editMapCommandMessage.editMapMessage?.message?.$case) {
            case "modifyAreaMessage": {
                const data = editMapCommandMessage.editMapMessage?.message.modifyAreaMessage;
                // execute command locally
                this.mapEditorModeManager.executeCommand(
                    {
                        type: "UpdateAreaCommand",
                        areaObjectConfig: data as AreaData,
                    },
                    false,
                    false
                );
                break;
            }
            case "createAreaMessage": {
                console.log("create area message");
                const data = editMapCommandMessage.editMapMessage?.message.createAreaMessage;
                const config: AreaData = {
                    ...data,
                    visible: true,
                    properties: {},
                };
                // execute command locally
                this.mapEditorModeManager.executeCommand(
                    {
                        type: "CreateAreaCommand",
                        areaObjectConfig: config,
                    },
                    false,
                    false
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
                    false
                );
                break;
            }
        }
    }

    public handleCommandExecution(commandConfig: CommandConfig): void {
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
                this.handleAreaPreviewUpdate(commandConfig.areaObjectConfig);
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
        // HACK: A way to update AreaPreviewWindow component values after performin undo / redo operations
        if (get(mapEditorSelectedAreaPreviewStore) !== undefined) {
            mapEditorSelectedAreaPreviewStore.set(areaPreview);
        }
    }

    public getAreaPreviewConfig(id: number): AreaData | undefined {
        return this.getAreaPreview(id)?.getConfig();
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
                const newAreaId = this.scene.getGameMap().getNextObjectId();
                if (newAreaId === undefined) {
                    return;
                }
                this.mapEditorModeManager.executeCommand({
                    type: "CreateAreaCommand",
                    areaObjectConfig: {
                        id: newAreaId,
                        name: `STATIC_AREA_${newAreaId}`,
                        visible: true,
                        properties: {},
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

    public handleAreaPreviewDeletion(id: number): void {
        this.deleteAreaPreview(id);
        this.scene.markDirty();
        mapEditorSelectedAreaPreviewStore.set(undefined);
        mapEditorSelectedPropertyStore.set(undefined);
    }

    public handleAreaPreviewCreation(config: AreaData): void {
        const areaPreview = new AreaPreview(this.scene, structuredClone(config));
        this.bindAreaPreviewEventHandlers(areaPreview);
        this.areaPreviews.push(areaPreview);
        this.scene.markDirty();
    }

    private handleAreaPreviewUpdate(config: AreaData): void {
        this.areaPreviews.find((area) => area.getConfig().id === config.id)?.updatePreview(config);
        this.scene.getGameMapFrontWrapper().updateAreaById(config.id, AreaType.Static, config);
        this.scene.markDirty();
    }

    private getAreaPreview(id: number): AreaPreview | undefined {
        return this.areaPreviews.find((area) => area.getId() === id);
    }

    private createAreaPreviews(): AreaPreview[] {
        this.areaPreviews = [];
        const areaConfigs = this.scene.getGameMapFrontWrapper().getAreas(AreaType.Static);

        for (const config of areaConfigs) {
            this.areaPreviews.push(this.createAreaPreview(config));
        }

        this.setAreaPreviewsVisibility(false);

        return this.areaPreviews;
    }

    private createAreaPreview(areaConfig: AreaData): AreaPreview {
        const areaPreview = new AreaPreview(this.scene, { ...areaConfig });
        this.bindAreaPreviewEventHandlers(areaPreview);
        return areaPreview;
    }

    private deleteAreaPreview(id: number): boolean {
        const index = this.areaPreviews.findIndex((preview) => preview.getConfig().id === id);
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
            mapEditorSelectedAreaPreviewStore.set(areaPreview);
        });
        areaPreview.on(AreaPreviewEvent.Changed, () => {
            this.mapEditorModeManager.executeCommand({
                type: "UpdateAreaCommand",
                areaObjectConfig: areaPreview.getConfig(),
            });
        });
    }

    private updateAreaPreviews(): void {
        const areaConfigs = this.scene.getGameMapFrontWrapper().getAreas(AreaType.Static);

        // find previews of areas that exist no longer
        const areaPreviewsToDelete: number[] = [];
        for (const preview of this.areaPreviews) {
            if (!areaConfigs.map((config) => config.id).includes(preview.getId())) {
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
        for (const config of areaConfigs) {
            const areaPreview = this.areaPreviews.find((areaPreview) => areaPreview.getId() === config.id);
            if (areaPreview) {
                areaPreview.updatePreview(config);
            } else {
                this.areaPreviews.push(this.createAreaPreview(config));
            }
        }
    }

    private setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }
}
