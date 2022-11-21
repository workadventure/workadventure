import { CommandConfig } from "@workadventure/map-editor";
import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { MapEditorTool } from "./MapEditorTool";

export class EntityEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();
    }

    public update(time: number, dt: number): void {
        console.log("EntityEditorTool update");
    }
    public clear(): void {
        console.log("EntityEditorTool clear");
    }
    public activate(): void {
        console.log("EntityEditorTool activate");
    }
    public destroy(): void {
        console.log("EntityEditorTool destroy");
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.log("EntityEditorTool subscribeToGameMapFrontWrapperEvents");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        console.log("EntityEditorTool handleKeyDownEvent");
    }
    /**
     * Perform actions needed to see the changes instantly
     */
    public handleCommandExecution(commandConfig: CommandConfig): void {
        console.log("EntityEditorTool handleCommandExecution");
    }
    /**
     * React on commands coming from the outside
     */
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): void {
        console.log("EntityEditorTool handleIncomingCommandMessage");
    }
}
