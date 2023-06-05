import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { UpdateWAMSettingFrontCommand } from "../Commands/WAM/UpdateWAMSettingFrontCommand";
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
     * React on commands coming from the outside
     */
    public async handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        const commandId = editMapCommandMessage.id;
        if (editMapCommandMessage.editMapMessage?.message?.$case === "updateWAMSettingsMessage") {
            const data = editMapCommandMessage.editMapMessage?.message.updateWAMSettingsMessage;

            const wam = this.scene.getGameMap().getWam();
            if (wam === undefined) {
                throw new Error("WAM file is undefined");
            }

            // execute command locally
            await this.mapEditorModeManager.executeCommand(
                new UpdateWAMSettingFrontCommand(wam, data, commandId),
                false,
                false
            );
        }
        return Promise.resolve();
    }
}
