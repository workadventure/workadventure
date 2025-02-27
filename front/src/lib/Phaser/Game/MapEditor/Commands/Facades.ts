import type { UpdateWAMSettingsMessage } from "@workadventure/messages";
import { gameManager } from "../../GameManager";
import { UpdateWAMSettingFrontCommand } from "./WAM/UpdateWAMSettingFrontCommand";

/**
 * A simple facade function that creates a UpdateWAMSettingFrontCommand and executes it.
 */
export async function executeUpdateWAMSettings(
    updateWAMSettingsMessage: UpdateWAMSettingsMessage["message"]
): Promise<void> {
    const wamFile = gameManager.getCurrentGameScene().getGameMap().getWam();
    if (!wamFile) {
        return;
    }
    await gameManager
        .getCurrentGameScene()
        .getMapEditorModeManager()
        .executeCommand(
            new UpdateWAMSettingFrontCommand(wamFile, {
                message: updateWAMSettingsMessage,
            })
        );
}
