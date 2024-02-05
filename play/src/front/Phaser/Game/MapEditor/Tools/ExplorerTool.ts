import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { analyticsClient } from "../../../../Administration/AnalyticsClient";
import { mapEditorVisibilityStore, mapExplorationModeStore } from "../../../../Stores/MapEditorStore";
import { gameManager } from "../../GameManager";
import { GameScene } from "../../GameScene";
import { MapEditorTool } from "./MapEditorTool";

export class ExplorerTool implements MapEditorTool {
    private scene: GameScene;
    private downIsPressed = false;
    private upIsPressed = false;
    private leftIsPressed = false;
    private rightIsPressed = false;

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
        mapExplorationModeStore.set(false);
    }
    public activate(): void {
        analyticsClient.openExplorationMode();
        mapExplorationModeStore.set(true);
        mapEditorVisibilityStore.set(true);

        this.scene.userInputManager.disableControls();
        this.scene.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
            if (event.key === "ArrowDown") {
                this.downIsPressed = true;
            }
            if (event.key === "ArrowUp") {
                this.upIsPressed = true;
            }
            if (event.key === "ArrowLeft") {
                this.leftIsPressed = true;
            }
            if (event.key === "ArrowRight") {
                this.rightIsPressed = true;
            }
        });
        this.scene.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
            if (event.key === "ArrowDown") {
                this.downIsPressed = false;
            }
            if (event.key === "ArrowUp") {
                this.upIsPressed = false;
            }
            if (event.key === "ArrowLeft") {
                this.leftIsPressed = false;
            }
            if (event.key === "ArrowRight") {
                this.rightIsPressed = false;
            }
        });
    }
    public destroy(): void {
        mapExplorationModeStore.set(false);
        this.scene.userInputManager.restoreControls();
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.info("Method not implemented.");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        console.info("Method not implemented.");
    }
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        console.info("Method not implemented.");
        return Promise.resolve();
    }
}
