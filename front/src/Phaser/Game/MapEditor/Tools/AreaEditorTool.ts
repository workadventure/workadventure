import { RoomConnection } from "../../../../Connexion/RoomConnection";
import { mapEditorSelectedAreaPreviewStore } from "../../../../Stores/MapEditorStore";
import { AreaPreview, AreaPreviewEvent } from "../../../Components/MapEditor/AreaPreview";
import { AreaType, ITiledMapRectangleObject } from "../../GameMap";
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

    public subscribeToStreams(connection: RoomConnection): void {
        connection.mapEditorModifyAreaMessageStream.subscribe((message) => {
            console.log(message);
            this.areaPreviews
                .find((area) => area.getConfig().id === message.id)
                ?.updateArea(message as ITiledMapRectangleObject, false);
            this.scene.getGameMap().updateAreaById(message.id, AreaType.Static, message);
            this.scene.markDirty();
        });
    }

    private createAreaPreviews(): AreaPreview[] {
        this.areaPreviews = [];
        const areaConfigs = this.scene.getGameMap().getAreas(AreaType.Static);

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
        areaPreview.on(AreaPreviewEvent.Updated, (config: ITiledMapRectangleObject) => {
            // EDIT AFTER MESSAGE FROM BACK FOR NOW. MAKE IT INSTANT IF USER MADE THE CHANGES THOUGH

            // this.scene.getGameMap().setArea(config.name, AreaType.Static, config);
            // this.scene.markDirty();

            this.scene.connection?.emitMapEditorModifyArea(config);
        });
    }

    private setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }
}
