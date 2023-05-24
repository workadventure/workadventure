import { CommandConfig } from "@workadventure/map-editor";
import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { MapEditorTool } from "./MapEditorTool";

export class WAMSettingsEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();
    }

    public update(time: number, dt: number): void {
        console.log("WAMSettingsEditorTool update");
    }
    public clear(): void {
        console.log("WAMSettingsEditorTool clear");
    }
    public activate(): void {
        console.log("WAMSettingsEditorTool activate");
    }
    public destroy(): void {
        console.log("WAMSettingsEditorTool destroy");
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.log("WAMSettingsEditorTool subscribeToGameMapFrontWrapperEvents");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        console.log("WAMSettingsEditorTool handleKeyDownEvent");
    }
    /**
     * Perform actions needed to see the changes instantly
     */
    public handleCommandExecution(commandConfig: CommandConfig, localCommand: boolean): void {
        console.log("WAMSettingsEditorTool handleCommandExecution");
    }
    /**
     * React on commands coming from the outside
     */
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): void {
        console.log("WAMSettingsEditorTool handleIncomingCommandMessage");
        if (editMapCommandMessage.editMapMessage?.message?.$case === "updateMegaphoneSettingMessage") {
            if (this.scene.wamFile.settings === undefined) {
                this.scene.wamFile.settings = {};
            }
            this.scene.wamFile.settings.megaphone =
                editMapCommandMessage.editMapMessage.message.updateMegaphoneSettingMessage;
        }
    }
}
