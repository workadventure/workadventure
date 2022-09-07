import { AreaType, ITiledMapRectangleObject } from "@workadventure/map-editor";
import { Subscription } from "rxjs";
import { get } from "svelte/store";
import { RoomConnection } from "../../../../Connexion/RoomConnection";
import { mapEditorSelectedAreaPreviewStore } from "../../../../Stores/MapEditorStore";
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

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();

        this.areaPreviews = this.createAreaPreviews();
    }

    public clear(): void {
        mapEditorSelectedAreaPreviewStore.set(undefined);
        this.setAreaPreviewsVisibility(false);
    }

    public activate(): void {
        this.setAreaPreviewsVisibility(true);
        this.scene.markDirty();
    }

    public destroy(): void {
        this.gameMapAreaUpdateSubscription.unsubscribe();
    }

    public subscribeToRoomConnection(connection: RoomConnection): void {
        connection.editMapMessageStream.subscribe((message) => {
            switch (message.message?.$case) {
                case "modifyAreaMessage": {
                    const data = message.message.modifyAreaMessage;
                    this.areaPreviews
                        .find((area) => area.getConfig().id === data.id)
                        ?.updatePreview(data as ITiledMapRectangleObject);
                    this.scene.getGameMapFrontWrapper().updateAreaById(data.id, AreaType.Static, data);
                    this.scene.markDirty();
                    break;
                }
                case "createAreaMessage": {
                    const data = message.message.createAreaMessage;
                    const config = {
                        class: "area",
                        name: "NEW STATIC AREA ;*",
                        visible: true,
                        ...data,
                    };
                    this.handleAreaPreviewCreation(config);
                    break;
                }
                case "deleteAreaMessage": {
                    const data = message.message.deleteAreaMessage;
                    const areaPreview = this.areaPreviews.find((preview) => preview.getConfig().id === data.id);
                    if (!areaPreview) {
                        break;
                    }
                    this.handleAreaPreviewDeletion(areaPreview);
                    break;
                }
            }
        });
    }

    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        this.gameMapAreaUpdateSubscription = gameMapFrontWrapper
            .getAreaUpdatedObservable()
            .subscribe((areaConfig: ITiledMapRectangleObject) => {
                this.updateAreaPreview(areaConfig);
                this.scene.markDirty();
            });
    }

    public unsubscribeFromGameMapFrontWrapperEvents(): void {
        this.gameMapAreaUpdateSubscription.unsubscribe();
    }

    public updateAreaPreview(config: ITiledMapRectangleObject): void {
        const areaPreview = this.getAreaPreview(config.id);
        if (!areaPreview) {
            return;
        }
        areaPreview.updatePreview(config);
        // HACK: A way to update AreaPreviewWindow component values after performin undo / redo operations
        mapEditorSelectedAreaPreviewStore.set(areaPreview);
    }

    public getAreaPreviewConfig(id: number): ITiledMapRectangleObject | undefined {
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
                this.handleAreaPreviewDeletion(areaPreview);
                break;
            }
            case "l": {
                const nextId = this.scene.getGameMap().getNextObjectId();
                if (nextId === undefined) {
                    break;
                }
                console.log(this.scene.input.activePointer.x, this.scene.input.activePointer.y);
                this.mapEditorModeManager.executeCommand({
                    type: "CreateAreaCommand",
                    areaObjectConfig: {
                        id: nextId,
                        class: "area",
                        name: "NEW STATIC AREA ;*",
                        visible: true,
                        width: 100,
                        height: 100,
                        x: this.scene.input.activePointer.x,
                        y: this.scene.input.activePointer.y,
                    },
                });
                this.scene.markDirty(); // make sure to refresh view and show new area preview
                break;
            }
            default: {
                break;
            }
        }
    }

    private handleAreaPreviewDeletion(areaPreview: AreaPreview): void {
        this.deleteAreaPreview(areaPreview.getConfig().id);
        this.scene.markDirty();
        mapEditorSelectedAreaPreviewStore.set(undefined);
    }

    private handleAreaPreviewCreation(config: ITiledMapRectangleObject): void {
        const areaPreview = new AreaPreview(this.scene, { ...config });
        this.bindAreaPreviewEventHandlers(areaPreview);
        this.areaPreviews.push(areaPreview);
        this.scene.markDirty();
    }

    private getAreaPreview(id: number): AreaPreview | undefined {
        return this.areaPreviews.find((area) => area.getId() === id);
    }

    private createAreaPreviews(): AreaPreview[] {
        this.areaPreviews = [];
        const areaConfigs = this.scene.getGameMapFrontWrapper().getAreas(AreaType.Static);

        for (const config of areaConfigs) {
            const areaPreview = new AreaPreview(this.scene, { ...config });
            this.bindAreaPreviewEventHandlers(areaPreview);
            this.areaPreviews.push(areaPreview);
        }

        this.setAreaPreviewsVisibility(false);

        return this.areaPreviews;
    }

    private deleteAreaPreview(id: number): boolean {
        const index = this.areaPreviews.findIndex((preview) => preview.getConfig().id === id);
        if (index !== -1) {
            this.areaPreviews.splice(index, 1)[0].destroy();
            return true;
        }
        return false;
    }

    private bindAreaPreviewEventHandlers(areaPreview: AreaPreview): void {
        areaPreview.on(AreaPreviewEvent.Clicked, () => {
            mapEditorSelectedAreaPreviewStore.set(areaPreview);
        });
    }

    private setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }
}
