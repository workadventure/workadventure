import type { UserInputHandlerInterface } from "../../Interfaces/UserInputHandlerInterface";
import type { GameScene } from "../Game/GameScene";

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
        if (pointer.rightButtonReleased() || pointer.getDuration() > 250) {
            return;
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
                this.gameScene.CurrentPlayer.setPathToFollow(path).catch((reason) => {});
            })
            .catch((reason) => {
                console.warn(reason);
            });
    }

    public handlePointerDownEvent(pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]): void {}

    public handleSpaceKeyUpEvent(event: Event): Event {
        this.gameScene.activateOutlinedItem();
        return event;
    }
}
