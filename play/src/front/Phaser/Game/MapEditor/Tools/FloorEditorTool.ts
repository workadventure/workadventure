import { CommandConfig } from "@workadventure/map-editor";
import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { MapEditorTool } from "./MapEditorTool";

export class FloorEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();
    }

    public update(time: number, dt: number): void {
        console.log("FloorEditorTool update");
    }
    public clear(): void {
        console.log("FloorEditorTool clear");
    }
    public activate(): void {
        console.log("FloorEditorTool activate");
    }
    public destroy(): void {
        console.log("FloorEditorTool destroy");
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.log("FloorEditorTool subscribeToGameMapFrontWrapperEvents");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        console.log("FloorEditorTool handleKeyDownEvent");
    }
    /**
     * Perform actions needed to see the changes instantly
     */
    public handleCommandExecution(commandConfig: CommandConfig, localCommand: boolean): void {
        console.log("FloorEditorTool handleCommandExecution");
    }
    /**
     * React on commands coming from the outside
     */
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): void {
        console.log("FloorEditorTool handleIncomingCommandMessage");
    }
}
