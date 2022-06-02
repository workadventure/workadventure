import { Unsubscriber } from "svelte/store";
import { editorModeStore } from "../../Stores/EditorStore";
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

    private editorModeUnsubscriber!: Unsubscriber;

    constructor(scene: GameScene) {
        this.scene = scene;

        this.active = false;

        this.subscribeToStores();
    }

    public isActive(): boolean {
        return this.active;
    }

    public destroy(): void {
        this.unsubscribeFromStores();
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
    }

    private unsubscribeFromStores(): void {
        this.editorModeUnsubscriber();
    }
}
