import { AreaType, ITiledMapRectangleObject } from "@map-editor-types";
import { Subscription } from "rxjs";
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

    public unsubscribeFromGameMapEvents(): void {
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
