import type { AreaData } from "@workadventure/map-editor";
import { EditMapCommandMessage } from "@workadventure/messages";
import { get } from "svelte/store";
import { userIsAdminStore, userIsEditorStore } from "../../../../Stores/GameStore";
import { mapEditorSelectedAreaPreviewStore, mapEditorVisibilityStore } from "../../../../Stores/MapEditorStore";
import { AreaPreview, AreaPreviewEvent } from "../../../Components/MapEditor/AreaPreview";
import { SizeAlteringSquare } from "../../../Components/MapEditor/SizeAlteringSquare";
import { Entity } from "../../../ECS/Entity";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { EntityRelatedEditorTool } from "./EntityRelatedEditorTool";
import { AreaEditorTool } from "./AreaEditorTool";

export class TrashEditorTool extends EntityRelatedEditorTool {
    protected ctrlKey?: Phaser.Input.Keyboard.Key;
    private areaPreviews: AreaPreview[] = [];
    private active = false;

    constructor(mapEditorModeManager: MapEditorModeManager, private areaEditorTool: AreaEditorTool) {
        super(mapEditorModeManager);

        this.active = false;
        this.ctrlKey = this.scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
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

        this.createAreaPreview(config);
        this.scene.markDirty();
    }

    public handleAreaPreviewCreation(config: AreaData, localCommand: boolean): void {
        console.info("handleAreaPreviewCreation => No create area preview in trash mode");
    }

    public activate() {
        super.activate();
        this.areaPreviews = this.createAreaPreviews();
        this.bindEventHandlers();
        this.active = true;
        this.setAreaPreviewsVisibility(this.getAreaPreviewVisibileFromUserPermissions());
        this.updateAreaPreviews();
        this.scene.markDirty();
        mapEditorVisibilityStore.set(false);
    }

    public clear() {
        super.clear();
        this.areaPreviews.forEach((preview) => preview.destroy());
        this.unbindEventHandlers();
        this.active = false;
        this.setAreaPreviewsVisibility(false);
        this.scene.markDirty();
    }

    handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        return Promise.resolve(undefined);
    }

    protected bindEventHandlers(): void {
        this.scene.input.on(Phaser.Input.Events.POINTER_UP, this.pointerUpEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_OVER, this.pointerHoverEventHandler);
        this.scene.input.on(Phaser.Input.Events.POINTER_OUT, this.pointerOutEventHandler);
    }

    protected unbindEventHandlers(): void {
        this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.pointerUpEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_OVER, this.pointerHoverEventHandler);
        this.scene.input.off(Phaser.Input.Events.POINTER_OUT, this.pointerOutEventHandler);
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
        const areaPreview = new AreaPreview(this.scene, structuredClone(areaConfig), undefined, this.ctrlKey);
        this.bindAreaPreviewEventHandlers(areaPreview);
        this.areaPreviews.push(areaPreview);
        return areaPreview;
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

    private bindAreaPreviewEventHandlers(areaPreview: AreaPreview): void {
        areaPreview.on(AreaPreviewEvent.Delete, () =>
            this.areaEditorTool.handleDeleteAreaFrontCommandExecution(areaPreview.getAreaData().id, this)
        );
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
        if (!this.active) {
            return;
        }

        const firstGameObject = gameObjects[0];

        if (firstGameObject && firstGameObject instanceof Entity) {
            if (!this.isAllowedToRemoveGameObject(firstGameObject)) {
                return;
            }
            firstGameObject.delete();
            return;
        }

        const areaEditorToolObjects = this.getAreaEditorToolObjectsFromGameObjects(gameObjects);
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
        if (!this.active) {
            return;
        }
        const areaEditorToolObjects = this.getAreaEditorToolObjectsFromGameObjects(gameObjects);
        if (areaEditorToolObjects.length === 1) {
            if (this.isAreaPreview(areaEditorToolObjects[0])) {
                areaEditorToolObjects[0].changeColor(0xff0000);
                this.scene.markDirty();
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
                areaEditorToolObjects[0].resetColor();
                this.scene.markDirty();
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
        const areaPreviews = gameObjects.filter((obj) => this.isAreaPreview(obj));
        const sizeAlteringSquares = gameObjects.filter((obj) => this.isSizeAlteringSquare(obj));
        return [...areaPreviews, ...sizeAlteringSquares];
    }

    private getAreaPreviewVisibileFromUserPermissions(): boolean {
        if (get(userIsAdminStore) || get(userIsEditorStore)) {
            return true;
        }
        return false;
    }

    private isAllowedToRemoveGameObject(gameObject: Entity) {
        return gameObject.canEdit;
    }
}
