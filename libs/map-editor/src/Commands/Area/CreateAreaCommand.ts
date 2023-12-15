import type { AreaData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export class CreateAreaCommand extends Command {
    protected readonly areaConfig: AreaData;

    protected gameMap: GameMap;

    constructor(gameMap: GameMap, areaObjectConfig: AreaData, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        this.areaConfig = structuredClone<AreaData>(areaObjectConfig);
    }

    public execute(): Promise<void> {
        if (!this.gameMap.getGameMapAreas()?.addArea(this.areaConfig)) {
            throw new Error(`MapEditorError: Could not execute CreateArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return Promise.resolve();
    }
}
