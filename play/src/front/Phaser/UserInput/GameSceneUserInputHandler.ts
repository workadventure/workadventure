import { get } from "svelte/store";
import { Player } from "../Player/Player";
import { RemotePlayer } from "../Entity/RemotePlayer";

import type { UserInputHandlerInterface } from "../../Interfaces/UserInputHandlerInterface";
import type { GameScene } from "../Game/GameScene";
import { mapEditorModeStore } from "../../Stores/MapEditorStore";
import { isActivatable } from "../Game/ActivatableInterface";
import { mapManagerActivated } from "../../Stores/MenuStore";

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
        // Calculate the velocity of the zoom
        const velocity = deltaY / 53;
        // Calculate the zoom factor
        const zoomFactor = 1 - velocity * 0.1;
        // Apply the zoom
        this.gameScene.zoomByFactor(zoomFactor, velocity);
    }

    public handlePointerUpEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {
        if (pointer.wasTouch || pointer.leftButtonReleased()) {
            for (const object of gameObjects) {
                if (isActivatable(object)) {
                    this.gameScene.getActivatablesManager().handlePointerDownEvent(object);
                    return;
                }
            }
        }

        if ((!pointer.wasTouch && pointer.leftButtonReleased()) || pointer.getDuration() > 250) {
            return;
        }

        if (!this.gameScene.userInputManager.isControlsEnabled) {
            return;
        }

        // If right click is disabled, we don't want to move the player
        if (!this.gameScene.userInputManager.isRightClickEnabled) {
            return;
        }

        for (const object of gameObjects) {
            if (object instanceof Player || object instanceof RemotePlayer) {
                return;
            }
        }
        const camera = this.gameScene.getCameraManager().getCamera();
        this.gameScene
            .moveTo(
                {
                    x: pointer.x + camera.scrollX,
                    y: pointer.y + camera.scrollY,
                },
                true
            )
            .catch((reason) => {
                console.warn(reason);
            });
    }

    public handlePointerDownEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {}

    public handlePointerMoveEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {}

    public handleKeyDownEvent(event: KeyboardEvent): KeyboardEvent {
        this.gameScene.getMapEditorModeManager()?.handleKeyDownEvent(event);
        switch (event.code) {
            case "KeyE": {
                if (get(mapManagerActivated) == false) return event;
                mapEditorModeStore.switchMode(!get(mapEditorModeStore));
                break;
            }
            case "KeyR": {
                this.gameScene.CurrentPlayer.rotate();
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
                this.handleActivableEntity();
                break;
            }
            default: {
                break;
            }
        }
        return event;
    }

    public handleActivableEntity() {
        const activatableManager = this.gameScene.getActivatablesManager();
        const activatable = activatableManager.getSelectedActivatableObject();
        if (activatable && activatable.isActivatable() && activatableManager.isSelectingByDistanceEnabled()) {
            activatable.activate();
            activatable.destroyText("object");
        }
        this.gameScene.CurrentPlayer.handlePressSpacePlayerTextCallback();
    }

    public addSpaceEventListener(callback: () => void): void {
        this.gameScene.input.keyboard?.addListener("keyup-SPACE", callback);
        this.gameScene.getActivatablesManager().disableSelectingByDistance();
    }
    public removeSpaceEventListener(callback: () => void): void {
        this.gameScene.input.keyboard?.removeListener("keyup-SPACE", callback);
        this.gameScene.getActivatablesManager().enableSelectingByDistance();
    }
}
