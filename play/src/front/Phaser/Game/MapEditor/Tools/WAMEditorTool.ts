import { CommandConfig } from "@workadventure/map-editor";
import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { MapEditorTool } from "./MapEditorTool";

export class WAMEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();
    }

    public update(time: number, dt: number): void {
        console.log("WAMEditorTool update");
    }
    public clear(): void {
        console.log("WAMEditorTool clear");
    }
    public activate(): void {
        console.log("WAMEditorTool activate");
    }
    public destroy(): void {
        console.log("WAMEditorTool destroy");
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.log("WAMEditorTool subscribeToGameMapFrontWrapperEvents");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        console.log("WAMEditorTool handleKeyDownEvent");
    }
    /**
     * Perform actions needed to see the changes instantly
     */
    public handleCommandExecution(commandConfig: CommandConfig, localCommand: boolean): void {
        console.log("WAMEditorTool handleCommandExecution");
    }
    /**
     * React on commands coming from the outside
     */
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): void {
        console.log("WAMEditorTool handleIncomingCommandMessage");
        if (editMapCommandMessage.editMapMessage?.message?.$case === "updateMegaphoneSettingMessage") {
            if (this.scene.wamFile.settings === undefined) {
                this.scene.wamFile.settings = {};
            }
            this.scene.wamFile.settings.megaphone =
                editMapCommandMessage.editMapMessage.message.updateMegaphoneSettingMessage;
        }
    }
}
