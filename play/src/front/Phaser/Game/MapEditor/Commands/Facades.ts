import type { UpdateWAMSettingsMessage } from "@workadventure/messages";
import { gameManager } from "../../GameManager";
import { UpdateWAMSettingFrontCommand } from "./WAM/UpdateWAMSettingFrontCommand";

/**
 * A simple facade function that creates a UpdateWAMSettingFrontCommand and executes it.
 */
export async function executeUpdateWAMSettings(
    updateWAMSettingsMessage: UpdateWAMSettingsMessage["message"]
): Promise<void> {
    const scene = gameManager.getCurrentGameScene();
    const wamFile = scene.wamFile ?? scene.getGameMap().getWamFile()?.getWam();
    if (!wamFile || !scene.connection) {
        return;
    }
    await scene.getMapEditorModeManager().executeCommand(
        new UpdateWAMSettingFrontCommand(
            wamFile,
            {
                message: updateWAMSettingsMessage,
            },
            scene.connection?.getAllTags(),
            scene.roomUrl
        )
    );
}
