import type { AreaData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export class DeleteAreaCommand extends Command {
    protected areaConfig: AreaData | undefined;

    protected gameMap: GameMap;

    constructor(gameMap: GameMap, protected areaId: string, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
    }

    public execute(): Promise<void> {
        const areaConfig = this.gameMap.getGameMapAreas()?.getArea(this.areaId);
        if (areaConfig) {
            this.areaConfig = structuredClone(areaConfig);
            if (!this.gameMap.getGameMapAreas()?.deleteArea(this.areaId)) {
                throw new Error(`MapEditorError: Could not execute DeleteArea Command. Area ID: ${this.areaId}`);
            }
        }
        return Promise.resolve();
    }
}
