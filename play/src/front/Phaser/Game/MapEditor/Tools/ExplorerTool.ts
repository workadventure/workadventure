import { EditMapCommandMessage } from "@workadventure/messages";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { MapEditorTool } from "./MapEditorTool";
import { analyticsClient } from "../../../../Administration/AnalyticsClient";
import { mapEditorModeStore, mapExplorationModeStore } from "../../../../Stores/MapEditorStore";

export class ExplorerTool extends MapEditorTool {
    public update(time: number, dt: number): void {
        console.info("Method not implemented.");
    }
    public clear(): void {
        mapExplorationModeStore.set(false);
    }
    public activate(): void {
        analyticsClient.openExplorationMode();
        mapExplorationModeStore.set(true);
        mapEditorModeStore.switchMode(false);
    }
    public destroy(): void {
        mapExplorationModeStore.set(false);
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.info("Method not implemented.");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        console.info("Method not implemented.");
    }
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        console.info("Method not implemented.");
        return Promise.resolve();
    }

}