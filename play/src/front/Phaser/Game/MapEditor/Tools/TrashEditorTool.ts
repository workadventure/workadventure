import type { AreaData } from "@workadventure/map-editor";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { AreaPreview, AreaPreviewEvent } from "../../../Components/MapEditor/AreaPreview";
import { DeleteAreaFrontCommand } from "../Commands/Area/DeleteAreaFrontCommand";
import { mapEditorSelectedAreaPreviewStore } from "../../../../Stores/MapEditorStore";
import { SizeAlteringSquare } from "../../../Components/MapEditor/SizeAlteringSquare";
import { EntityEditorTool } from "./EntityEditorTool";

export class TrashEditorTool extends EntityEditorTool {
    private areaPreviews: AreaPreview[];

    protected shiftKey?: Phaser.Input.Keyboard.Key;
    protected ctrlKey?: Phaser.Input.Keyboard.Key;

    private active = false;

    // private mapEditorSelectedAreaPreviewStoreSubscribe!: Unsubscriber;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super(mapEditorModeManager);

        this.active = false;

        this.shiftKey = this.scene.input.keyboard?.addKey("SHIFT");
        this.ctrlKey = this.scene.input.keyboard?.addKey("CTRL");

        this.areaPreviews = this.createAreaPreviews();
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

    private setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }

    private bindAreaPreviewEventHandlers(areaPreview: AreaPreview): void {
        areaPreview.on(AreaPreviewEvent.Delete, () => {
            this.mapEditorModeManager
                .executeCommand(
                    new DeleteAreaFrontCommand(
                        this.scene.getGameMap(),
                        areaPreview.getAreaData().id,
                        undefined,
                        this,
                        true
                    )
                )
                .catch((e) => console.error(e));
        });
    }

    private deleteAreaPreview(id: string): boolean {
        const index = this.areaPreviews.findIndex((preview) => preview.getAreaData().id === id);
        if (index !== -1) {
            this.areaPreviews.splice(index, 1)[0].destroy();
            return true;
        }
        return false;
    }

    private pointerUpEventHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
        console.log("pointerUpEventHandler", this.active);
        if (!this.active) {
            return;
        }
        const areaEditorToolObjects = this.getAreaEditorToolObjectsFromGameObjects(gameObjects);
        console.log("pointerUpEventHandler => areaEditorToolObjects", areaEditorToolObjects);
        if (areaEditorToolObjects.length === 1) {
            if (this.isAreaPreview(areaEditorToolObjects[0])) {
                areaEditorToolObjects[0].delete();
            }
        }
    };

    private pointerHoverEventHandler = (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[]
    ) => {
        console.log("pointerHoverEventHandler", this.active);
        if (!this.active) {
            return;
        }
        const areaEditorToolObjects = this.getAreaEditorToolObjectsFromGameObjects(gameObjects);
        console.log("pointerHoverEventHandler => areaEditorToolObjects", areaEditorToolObjects);
        if (areaEditorToolObjects.length === 1) {
            if (this.isAreaPreview(areaEditorToolObjects[0])) {
                areaEditorToolObjects[0].changeColor(0xff0000);
            }
        }
    };

    private pointerOutEventHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
        console.log("pointerOutEventHandler", this.active);
        if (!this.active) {
            return;
        }
        const areaEditorToolObjects = this.getAreaEditorToolObjectsFromGameObjects(gameObjects);
        console.log("pointerHoverEventHandler => areaEditorToolObjects", areaEditorToolObjects);
        if (areaEditorToolObjects.length === 1) {
            if (this.isAreaPreview(areaEditorToolObjects[0])) {
                areaEditorToolObjects[0].resetColor();
            }
        }
    };

    private isAreaPreview(obj: Phaser.GameObjects.GameObject): obj is AreaPreview {
        return obj instanceof AreaPreview;
    }

    private isSizeAlteringSquare(obj: Phaser.GameObjects.GameObject): obj is SizeAlteringSquare {
        return obj instanceof SizeAlteringSquare;
    }

    private getAreaEditorToolObjectsFromGameObjects(
        gameObjects: Phaser.GameObjects.GameObject[]
    ): (AreaPreview | SizeAlteringSquare)[] {
        const areaPreviews = gameObjects.filter((obj) => this.isAreaPreview(obj)) as AreaPreview[];
        const sizeAlteringSquares = gameObjects.filter((obj) => this.isSizeAlteringSquare(obj)) as SizeAlteringSquare[];
        return [...areaPreviews, ...sizeAlteringSquares];
    }

    protected bindEventHandlers(): void {
        super.bindEventHandlers();

        this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.pointerUpEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_OVER, this.pointerHoverEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_OUT, this.pointerOutEventHandler);
    }

    protected unbindEventHandlers(): void {
        super.unbindEventHandlers();

        this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.pointerUpEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_OVER, this.pointerHoverEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_OUT, this.pointerOutEventHandler);
    }

    public handleAreaPreviewDeletion(id: string): void {
        if (!this.active) {
            return;
        }

        this.deleteAreaPreview(id);
        this.scene.markDirty();
        mapEditorSelectedAreaPreviewStore.set(undefined);
    }

    public handleAreaPreviewCreation(config: AreaData, localCommand: boolean): void {
        console.info("handleAreaPreviewCreation => No create area preview in trash mode");
    }

    public activate() {
        this.active = true;
        this.setAreaPreviewsVisibility(true);
        this.bindEventHandlers();
        // TODO: This is a hack to force update of the area preview when it's selected. It's needed because
        //this.mapEditorSelectedAreaPreviewStoreSubscribe = mapEditorSelectedAreaPreviewStore.subscribe(() => {
        //});
    }

    public clear() {
        this.active = false;
        this.setAreaPreviewsVisibility(false);
        this.unbindEventHandlers();
        this.scene.markDirty();
        //this.mapEditorSelectedAreaPreviewStoreSubscribe();
    }

    public destroy(): void {
        super.destroy();
        //this.mapEditorSelectedAreaPreviewStoreSubscribe();
    }
}
