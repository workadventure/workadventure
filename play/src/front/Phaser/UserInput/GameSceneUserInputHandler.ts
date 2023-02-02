import { Player } from "../Player/Player";
import { RemotePlayer } from "../Entity/RemotePlayer";

import type { UserInputHandlerInterface } from "../../Interfaces/UserInputHandlerInterface";
import type { GameScene } from "../Game/GameScene";
import { mapEditorModeStore } from "../../Stores/MapEditorStore";
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
        if (!this.gameScene.userInputManager.isControlsEnabled) {
            return;
        }

        if ((!pointer.wasTouch && pointer.leftButtonReleased()) || pointer.getDuration() > 250) {
            if (get(mapEditorModeStore)) {
                this.gameScene.getMapEditorModeManager()?.handlePointerUpEvent(pointer, gameObjects);
            }
            return;
        }

        for (const object of gameObjects) {
            if (object instanceof Player || object instanceof RemotePlayer) {
                return;
            }
        }

        this.setPathToFollow(pointer);
    }

    public handlePointerDownEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        if (!this.gameScene.userInputManager.isControlsEnabled) {
            return;
        }

        this.gameScene.getActivatablesManager().handlePointerDownEvent();

        if (get(mapEditorModeStore)) {
            this.gameScene.getMapEditorModeManager()?.handlePointerDownEvent(pointer, gameObjects);
        }
    }

    public handlePointerMoveEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        if (get(mapEditorModeStore)) {
            this.gameScene.getMapEditorModeManager()?.handlePointerMoveEvent(pointer, gameObjects);
        }
    }

    public handleKeyDownEvent(event: KeyboardEvent): KeyboardEvent {
        if (get(mapEditorModeStore)) {
            this.gameScene.getMapEditorModeManager()?.handleKeyDownEvent(event);
        }
        switch (event.code) {
            case "KeyE": {
                mapEditorModeStore.switchMode(!get(mapEditorModeStore));
                break;
            }
            default: {
                break;
            }
        }
        return event;
    }

    public handleKeyUpEvent(event: KeyboardEvent): KeyboardEvent {
        switch (event.key) {
            // SPACE
            case " ": {
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

    public addSpaceEventListener(callback: () => void): void {
        this.gameScene.input.keyboard.addListener("keyup-SPACE", callback);
        this.gameScene.getActivatablesManager().disableSelectingByDistance();
    }
    public removeSpaceEventListener(callback: () => void): void {
        this.gameScene.input.keyboard.removeListener("keyup-SPACE", callback);
        this.gameScene.getActivatablesManager().enableSelectingByDistance();
    }

    private setPathToFollow(pointer: Phaser.Input.Pointer): void {
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
}
