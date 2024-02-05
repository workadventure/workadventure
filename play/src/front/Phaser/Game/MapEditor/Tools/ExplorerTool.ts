import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { analyticsClient } from "../../../../Administration/AnalyticsClient";
import { mapEditorVisibilityStore, mapExplorationModeStore } from "../../../../Stores/MapEditorStore";
import { gameManager } from "../../GameManager";
import { GameScene } from "../../GameScene";
import { MapEditorTool } from "./MapEditorTool";
import debug from "debug";

const logger = debug("explorer-tool");

export class ExplorerTool implements MapEditorTool {
    private scene: GameScene;
    private downIsPressed = false;
    private upIsPressed = false;
    private leftIsPressed = false;
    private rightIsPressed = false;

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
    private wheelHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[], deltaX: number, deltaY: number, deltaZ: number) => {
        this.scene.zoomByFactor(1 - (deltaY / 53) * 0.1);
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
        this.scene.userInputManager.restoreControls();
        this.scene.input.keyboard?.removeListener("keydown", this.keyDownHandler);
        this.scene.input.keyboard?.removeListener("keyup", this.keyUpHandler);
        this.scene.input.removeListener("wheel", this.wheelHandler);

        mapExplorationModeStore.set(false);
    }
    public activate(): void {
        analyticsClient.openExplorationMode();
        mapExplorationModeStore.set(true);
        mapEditorVisibilityStore.set(true);

        this.scene.userInputManager.disableControls();
        this.scene.input.keyboard?.on("keydown", this.keyDownHandler);
        this.scene.input.keyboard?.on("keyup", this.keyUpHandler);
        this.scene.input.on("wheel", this.wheelHandler);
    }
    public destroy(): void {
        this.clear();
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        debug("subscribeToGameMapFrontWrapperEvents => Method not implemented.");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        debug("handleKeyDownEvent => Method not implemented.");
    }
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        debug("handleIncomingCommandMessage => Method not implemented.");
        return Promise.resolve();
    }
}
