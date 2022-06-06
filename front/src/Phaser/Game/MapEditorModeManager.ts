import { Unsubscriber } from "svelte/store";
import { mapEditorModeDragCameraPointerDownStore, mapEditorModeStore } from "../../Stores/MapEditorStore";
import { AreaPreview } from "../Components/MapEditor/AreaPreview";
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

        this.areaPreviews = new Map<string, AreaPreview>();

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
        console.log(`active tool: ${tool}`);
        // TODO: Clear to neutral state (hide things etc)
        this.activeTool = tool;
        // TODO: activate tools specific things
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
