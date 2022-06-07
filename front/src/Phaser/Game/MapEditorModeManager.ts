import { Unsubscriber } from "svelte/store";
import { mapEditorModeDragCameraPointerDownStore, mapEditorModeStore } from "../../Stores/MapEditorStore";
import { AreaPreview, AreaPreviewEvent } from "../Components/MapEditor/AreaPreview";
import { GameScene } from "./GameScene";

export enum EditorTool {
    None = "None",
    AreaSelector = "AreaSelector",
}

export class MapEditorModeManager {
    private scene: GameScene;

    /**
     * Is user currently in Editor Mode
     */
    private active: boolean;

    /**
     * Is pointer currently down (map dragging etc)
     */
    private pointerDown: boolean;

    /**
     * What are we using right now
     */
    private activeTool: EditorTool;

    /**
     * Visual representations of map Areas objects
     */
    private areaPreviews: Map<string, AreaPreview>;

    private mapEditorModeUnsubscriber!: Unsubscriber;
    private pointerDownUnsubscriber!: Unsubscriber;

    constructor(scene: GameScene) {
        this.scene = scene;

        this.active = false;
        this.pointerDown = false;

        this.activeTool = EditorTool.None;

        this.areaPreviews = this.createAreaPreviews();

        this.subscribeToStores();
    }

    public isActive(): boolean {
        return this.active;
    }

    public isPointerDown(): boolean {
        return this.pointerDown;
    }

    public destroy(): void {
        this.unsubscribeFromStores();
        this.pointerDownUnsubscriber();
    }

    public handleKeyDownEvent(event: KeyboardEvent): void {
        switch (event.key) {
            case "`": {
                this.equipTool(EditorTool.None);
                break;
            }
            case "1": {
                this.equipTool(EditorTool.AreaSelector);
                break;
            }
            default: {
                break;
            }
        }
    }

    private equipTool(tool: EditorTool): void {
        if (this.activeTool === tool) {
            return;
        }
        this.clearToNeutralState();
        this.activeTool = tool;
        this.activateTool(tool);
    }

    /**
     * Hide everything related to tools like Area Previews etc
     */
    private clearToNeutralState(): void {
        this.setAreaPreviewsVisibility(false);
    }

    /**
     * Show things necessary for tool's usage
     */
    private activateTool(tool: EditorTool): void {
        switch (tool) {
            case EditorTool.None: {
                break;
            }
            case EditorTool.AreaSelector: {
                this.setAreaPreviewsVisibility(true);
                break;
            }
        }
    }

    private createAreaPreviews(): Map<string, AreaPreview> {
        this.areaPreviews = new Map<string, AreaPreview>();
        const areasData = this.scene.getGameMap().getAreas();

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
            console.log(this.scene.getGameMap().getArea(areaPreview.getName()));
        });
    }

    private setAreaPreviewsVisibility(visible: boolean): void {
        // NOTE: I would really like to use Phaser Layers here but it seems that there's a problem with Areas still being
        //       interactive when we hide whole Layer and thus forEach is needed.
        this.areaPreviews.forEach((area) => area.setVisible(visible));
    }

    private subscribeToStores(): void {
        this.mapEditorModeUnsubscriber = mapEditorModeStore.subscribe((active) => {
            this.active = active;
            if (active) {
                this.scene.CurrentPlayer.finishFollowingPath(true);
                this.scene.CurrentPlayer.stop();
                this.scene.getCameraManager().stopFollow();
            } else {
                this.scene.getCameraManager().startFollowPlayer(this.scene.CurrentPlayer);
                this.equipTool(EditorTool.None);
            }
        });

        this.pointerDownUnsubscriber = mapEditorModeDragCameraPointerDownStore.subscribe((pointerDown) => {
            this.pointerDown = pointerDown;
        });
    }

    private unsubscribeFromStores(): void {
        this.mapEditorModeUnsubscriber();
    }
}
