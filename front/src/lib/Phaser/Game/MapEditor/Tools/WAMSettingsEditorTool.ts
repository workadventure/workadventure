import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { UpdateWAMSettingFrontCommand } from "../Commands/WAM/UpdateWAMSettingFrontCommand";
import { mapEditorVisibilityStore } from "../../../../Stores/MapEditorStore";
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
        // Nothing to be done
    }
    public clear(): void {
        // Nothing to be done
    }
    public activate(): void {
        mapEditorVisibilityStore.set(false);
    }
    public destroy(): void {
        // Nothing to be done
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        // Nothing to be done
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        // Nothing to be done
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
            await this.mapEditorModeManager.executeLocalCommand(new UpdateWAMSettingFrontCommand(wam, data, commandId));
        }
        return Promise.resolve();
    }
}
