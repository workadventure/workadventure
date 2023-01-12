import type { AreaData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { AreaType } from "../../types";
import { Command } from "../Command";

export interface UpdateAreaCommandConfig {
    type: "UpdateAreaCommand";
    areaObjectConfig: AreaData;
}

export class UpdateAreaCommand extends Command {
    private oldConfig: AreaData;
    private newConfig: AreaData;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: UpdateAreaCommandConfig) {
        super();
        this.gameMap = gameMap;
        const oldConfig = gameMap.getGameMapAreas().getArea(config.areaObjectConfig.id, AreaType.Static);
        if (!oldConfig) {
            throw new Error("Trying to update a non existing Area!");
        }
        this.newConfig = structuredClone(config.areaObjectConfig);
        this.oldConfig = structuredClone(oldConfig);
    }

    public execute(): UpdateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas().updateAreaById(this.newConfig.id, AreaType.Static, this.newConfig)) {
            throw new Error(`MapEditorError: Could not execute UpdateArea Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: "UpdateAreaCommand", areaObjectConfig: this.newConfig };
    }

    public undo(): UpdateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas().updateAreaById(this.oldConfig.id, AreaType.Static, this.oldConfig)) {
            throw new Error(`MapEditorError: Could not undo UpdateArea Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: "UpdateAreaCommand", areaObjectConfig: this.oldConfig };
    }
}
