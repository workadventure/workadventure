import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { mapEditorModeStore, mapEditorVisibilityStore } from "../../../../Stores/MapEditorStore";
import { gameManager } from "../../GameManager";
import { analyticsClient } from "../../../../Administration/AnalyticsClient";
import { MapEditorTool } from "./MapEditorTool";

export class CloseTool implements MapEditorTool {
    public update(time: number, dt: number): void {
        // Nothing to be done
    }
    public clear(): void {
        // Nothing to be done
    }
    public activate(): void {
        analyticsClient.toggleMapEditor(false);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);
        mapEditorModeStore.switchMode(false);
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
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        // Nothing to be done
        return Promise.resolve();
    }
}
