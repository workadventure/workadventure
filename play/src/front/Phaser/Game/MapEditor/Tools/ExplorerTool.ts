import { EditMapCommandMessage } from "@workadventure/messages";
import debug from "debug";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { analyticsClient } from "../../../../Administration/AnalyticsClient";
import { mapEditorVisibilityStore, mapExplorationModeStore } from "../../../../Stores/MapEditorStore";
import { gameManager } from "../../GameManager";
import { GameScene } from "../../GameScene";
import { MapEditorTool } from "./MapEditorTool";

const logger = debug("explorer-tool");

export class ExplorerTool implements MapEditorTool {
    private scene: GameScene;
    private downIsPressed = false;
    private upIsPressed = false;
    private leftIsPressed = false;
    private rightIsPressed = false;
    private explorationMouseIsActive = false;

    private keyDownHandler = (event: KeyboardEvent) => {
        if (event.key === "ArrowDown" || event.key === "s") {
            this.downIsPressed = true;
        }
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "z") {
            this.upIsPressed = true;
        }
        if (event.key === "ArrowLeft" || event.key === "q" || event.key === "a") {
            this.leftIsPressed = true;
        }
        if (event.key === "ArrowRight" || event.key === "d") {
            this.rightIsPressed = true;
        }
    };
    private keyUpHandler = (event: KeyboardEvent) => {
        if (event.key === "ArrowDown" || event.key === "s") {
            this.downIsPressed = false;
        }
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "z") {
            this.upIsPressed = false;
        }
        if (event.key === "ArrowLeft" || event.key === "q" || event.key === "a") {
            this.leftIsPressed = false;
        }
        if (event.key === "ArrowRight" || event.key === "d") {
            this.rightIsPressed = false;
        }
    };
    private wheelHandler = (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number
    ) => {
        this.scene.zoomByFactor(1 - (deltaY / 53) * 0.1);
    };
    private pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
        this.explorationMouseIsActive = true;
    };
    private pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
        if (!this.explorationMouseIsActive) return;
        this.scene.cameras.main.scrollX -= pointer.velocity.x / 10;
        this.scene.cameras.main.scrollY -= pointer.velocity.y / 10;
        this.scene.markDirty();
    };
    private pointerUpHandler = (pointer: Phaser.Input.Pointer) => {
        this.explorationMouseIsActive = false;
        this.scene.markDirty();
    };

    constructor() {
        this.scene = gameManager.getCurrentGameScene();
    }
    public update(time: number, dt: number): void {
        if (this.downIsPressed) {
            this.scene.cameras.main.scrollY += 10;
        }
        if (this.upIsPressed) {
            this.scene.cameras.main.scrollY -= 10;
        }
        if (this.leftIsPressed) {
            this.scene.cameras.main.scrollX -= 10;
        }
        if (this.rightIsPressed) {
            this.scene.cameras.main.scrollX += 10;
        }
        this.scene.markDirty();
    }
    public clear(): void {
        analyticsClient.closeExplorationMode();

        this.scene.userInputManager.restoreControls();

        this.scene.input.keyboard?.removeListener("keydown", this.keyDownHandler);
        this.scene.input.keyboard?.removeListener("keyup", this.keyUpHandler);

        this.scene.input.removeListener("wheel", this.wheelHandler);
        this.scene.input.removeListener("pointerdown", this.pointerDownHandler);
        this.scene.input.removeListener("pointermove", this.pointerMoveHandler);
        this.scene.input.removeListener("pointerup", this.pointerUpHandler);

        this.scene.getCameraManager().startFollowPlayer(this.scene.CurrentPlayer, 1000);

        mapExplorationModeStore.set(false);
        // Reset to true for the next tool used
        mapEditorVisibilityStore.set(true);
    }
    public activate(): void {
        analyticsClient.openExplorationMode();

        mapExplorationModeStore.set(true);
        mapEditorVisibilityStore.set(true);

        this.scene.userInputManager.disableControls();

        this.scene.input.keyboard?.on("keydown", this.keyDownHandler);
        this.scene.input.keyboard?.on("keyup", this.keyUpHandler);

        this.scene.input.on("wheel", this.wheelHandler);
        this.scene.input.on("pointerdown", this.pointerDownHandler);
        this.scene.input.on("pointermove", this.pointerMoveHandler);
        this.scene.input.on("pointerup", this.pointerUpHandler);

        this.scene.getCameraManager().setExplorationMode();

        this.scene.markDirty();
    }
    public destroy(): void {
        this.clear();
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        logger("subscribeToGameMapFrontWrapperEvents => Method not implemented.");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        logger("handleKeyDownEvent => Method not implemented.");
    }
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        logger("handleIncomingCommandMessage => Method not implemented.");
        return Promise.resolve();
    }
}
