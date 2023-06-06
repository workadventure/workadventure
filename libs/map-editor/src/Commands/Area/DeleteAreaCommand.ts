import type { AreaData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export class DeleteAreaCommand extends Command {
    protected areaConfig: AreaData;

    protected gameMap: GameMap;

    constructor(gameMap: GameMap, id: string, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        const areaConfig = gameMap.getGameMapAreas()?.getArea(id);
        if (!areaConfig) {
            throw new Error("Trying to delete a non existing Area!");
        }
        this.areaConfig = structuredClone(areaConfig);
    }

    public execute(): Promise<void> {
        if (!this.gameMap.getGameMapAreas()?.deleteArea(this.areaConfig.id)) {
            throw new Error(`MapEditorError: Could not execute DeleteArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return Promise.resolve();
    }
}
