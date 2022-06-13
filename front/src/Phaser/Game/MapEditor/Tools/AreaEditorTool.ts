import { AreaPreview, AreaPreviewEvent } from "../../../Components/MapEditor/AreaPreview";
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
        this.setAreaPreviewsVisibility(false);
    }

    public activate(): void {
        this.setAreaPreviewsVisibility(true);
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
            console.log(areaPreview.getName());
            console.log(this.scene.getGameMap().getArea(areaPreview.getName(), AreaType.Static));
        });
    }

    private setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }
}
