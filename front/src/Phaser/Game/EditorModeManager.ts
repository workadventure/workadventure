import { Unsubscriber } from "svelte/store";
import {
    editorModeDragCameraPointerDownStore as editorModePointerDownStore,
    editorModeStore,
} from "../../Stores/EditorStore";
import { GameScene } from "./GameScene";

export enum EditorTool {
    AreaSelector = 0,
}

export class EditorModeManager {
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

    private editorModeUnsubscriber!: Unsubscriber;
    private pointerDownUnsubscriber!: Unsubscriber;

    constructor(scene: GameScene) {
        this.scene = scene;

        this.active = false;
        this.pointerDown = false;

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
        console.log(event.key);
        switch (event.key) {
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
        // TODO: Clear to neutral state (hide things etc)
        this.activeTool = tool;
        // TODO: activate tools specific things
    }

    private subscribeToStores(): void {
        this.editorModeUnsubscriber = editorModeStore.subscribe((active) => {
            this.active = active;
            if (active) {
                this.scene.CurrentPlayer.finishFollowingPath(true);
                this.scene.CurrentPlayer.stop();
                this.scene.getCameraManager().stopFollow();
            } else {
                this.scene.getCameraManager().startFollowPlayer(this.scene.CurrentPlayer);
            }
        });

        this.pointerDownUnsubscriber = editorModePointerDownStore.subscribe((pointerDown) => {
            this.pointerDown = pointerDown;
        });
    }

    private unsubscribeFromStores(): void {
        this.editorModeUnsubscriber();
    }
}
