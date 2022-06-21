import { mapEditorSelectedAreaPreviewStore } from "../../../../Stores/MapEditorStore";
import { AreaPreview, AreaPreviewEvent } from "../../../Components/MapEditor/AreaPreview";
import { ITiledMapObject } from "../../../Map/ITiledMap";
import { AreaType } from "../../GameMap";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { MapEditorTool } from "./MapEditorTool";

export class AreaEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    /**
     * Visual representations of map Areas objects
     */
    private areaPreviews: Map<string, AreaPreview>;

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

    private createAreaPreviews(): Map<string, AreaPreview> {
        this.areaPreviews = new Map<string, AreaPreview>();
        const areasData = this.scene.getGameMap().getAreas(AreaType.Static);

        for (const [key, val] of areasData) {
            const areaPreview = new AreaPreview(this.scene, { ...val });
            this.bindAreaPreviewEventHandlers(areaPreview);
            this.areaPreviews.set(key, areaPreview);
        }

        this.setAreaPreviewsVisibility(false);

        return this.areaPreviews;
    }

    private bindAreaPreviewEventHandlers(areaPreview: AreaPreview): void {
        areaPreview.on(AreaPreviewEvent.Clicked, () => {
            mapEditorSelectedAreaPreviewStore.set(areaPreview);
            console.log(areaPreview.getConfig());
            // console.log(areaPreview.getName());
            // console.log(this.scene.getGameMap().getArea(areaPreview.getName(), AreaType.Static));
        });
        areaPreview.on(AreaPreviewEvent.Updated, (config: ITiledMapObject) => {
            this.scene.getGameMap().setArea(config.name, AreaType.Static, config);
            this.scene.markDirty();
        });
    }

    private setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }
}
