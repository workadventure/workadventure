import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { mapEditorModeStore, mapEditorVisibilityStore } from "../../../../Stores/MapEditorStore";
import { gameManager } from "../../GameManager";
import { analyticsClient } from "../../../../Administration/AnalyticsClient";
import { MapEditorTool } from "./MapEditorTool";

export class CloseTool implements MapEditorTool {
    public update(time: number, dt: number): void {
        console.warn("Method not implemented.", time, dt);
    }
    public clear(): void {
        console.warn("Method not implemented.");
    }
    public activate(): void {
        analyticsClient.toggleMapEditor(false);
        gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);
        mapEditorModeStore.switchMode(false);
        mapEditorVisibilityStore.set(false);
    }
    public destroy(): void {
        console.warn("Method not implemented.");
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.warn("Method not implemented.", gameMapFrontWrapper);
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        console.warn("Method not implemented.", event);
    }
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        console.warn("Method not implemented.", editMapCommandMessage);
        return Promise.resolve();
    }
}
