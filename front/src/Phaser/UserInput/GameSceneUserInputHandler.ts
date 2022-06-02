import { Player } from "../Player/Player";
import { RemotePlayer } from "../Entity/RemotePlayer";

import type { UserInputHandlerInterface } from "../../Interfaces/UserInputHandlerInterface";
import type { GameScene } from "../Game/GameScene";
import { editorModeDragCameraPointerDownStore, editorModeStore } from "../../Stores/EditorStore";
import { get } from "svelte/store";

export class GameSceneUserInputHandler implements UserInputHandlerInterface {
    private gameScene: GameScene;

    constructor(gameScene: GameScene) {
        this.gameScene = gameScene;
    }

    public handleMouseWheelEvent(
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number
    ): void {
        this.gameScene.zoomByFactor(1 - (deltaY / 53) * 0.1);
    }

    public handlePointerUpEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        if (this.gameScene.getEditorModeManager().isActive()) {
            editorModeDragCameraPointerDownStore.set(false);
        }
        if ((!pointer.wasTouch && pointer.leftButtonReleased()) || pointer.getDuration() > 250) {
            return;
        }

        if (!this.gameScene.userInputManager.isControlsEnabled) {
            return;
        }

        for (const object of gameObjects) {
            if (object instanceof Player || object instanceof RemotePlayer) {
                return;
            }
        }
        const camera = this.gameScene.getCameraManager().getCamera();
        const index = this.gameScene
            .getGameMap()
            .getTileIndexAt(pointer.x + camera.scrollX, pointer.y + camera.scrollY);
        const startTile = this.gameScene
            .getGameMap()
            .getTileIndexAt(this.gameScene.CurrentPlayer.x, this.gameScene.CurrentPlayer.y);
        this.gameScene
            .getPathfindingManager()
            .findPath(startTile, index, true, true)
            .then((path) => {
                // Remove first step as it is for the tile we are currently standing on
                path.shift();
                this.gameScene.CurrentPlayer.setPathToFollow(path).catch(() => {});
            })
            .catch((reason) => {
                console.warn(reason);
            });
    }

    public handlePointerDownEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        if (this.gameScene.getEditorModeManager().isActive()) {
            editorModeDragCameraPointerDownStore.set(true);
        }
    }

    public handlePointerMoveEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        // TODO: Set pointerDown to false if moved out of the game screen
        if (this.gameScene.getEditorModeManager().isActive() && this.gameScene.getEditorModeManager().isPointerDown()) {
            // NOTE: Not a perfect solution but will do for now. dx / dy would be preferable?
            this.gameScene.getCameraManager().scrollBy(-pointer.velocity.x / 10, -pointer.velocity.y / 10);
        }
    }

    public handleKeyDownEvent(event: KeyboardEvent): KeyboardEvent {
        switch (event.code) {
            case "KeyE": {
                editorModeStore.set(!get(editorModeStore));
                break;
            }
            default: {
                break;
            }
        }
        return event;
    }

    public handleKeyUpEvent(event: KeyboardEvent): KeyboardEvent {
        switch (event.code) {
            case "Space": {
                const activatableManager = this.gameScene.getActivatablesManager();
                const activatable = activatableManager.getSelectedActivatableObject();
                if (activatable && activatable.isActivatable() && activatableManager.isSelectingByDistanceEnabled()) {
                    activatable.activate();
                }
                break;
            }
            default: {
                break;
            }
        }
        return event;
    }

    public handleSpaceKeyUpEvent(event: Event): Event {
        const activatableManager = this.gameScene.getActivatablesManager();
        const activatable = activatableManager.getSelectedActivatableObject();
        if (activatable && activatable.isActivatable() && activatableManager.isSelectingByDistanceEnabled()) {
            activatable.activate();
        }
        return event;
    }

    public addSpaceEventListener(callback: Function): void {
        this.gameScene.input.keyboard.addListener("keyup-SPACE", callback);
        this.gameScene.getActivatablesManager().disableSelectingByDistance();
    }
    public removeSpaceEventListner(callback: Function): void {
        this.gameScene.input.keyboard.removeListener("keyup-SPACE", callback);
        this.gameScene.getActivatablesManager().enableSelectingByDistance();
    }
}
