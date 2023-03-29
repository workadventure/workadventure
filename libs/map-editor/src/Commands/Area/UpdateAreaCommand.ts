import type { AtLeast, AreaData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export interface UpdateAreaCommandConfig {
    type: "UpdateAreaCommand";
    dataToModify: AtLeast<AreaData, "id">;
}

export class UpdateAreaCommand extends Command {
    private oldConfig: AtLeast<AreaData, "id">;
    private newConfig: AtLeast<AreaData, "id">;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: UpdateAreaCommandConfig, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        const oldConfig = gameMap.getGameMapAreas()?.getArea(config.dataToModify.id);
        if (!oldConfig) {
            throw new Error("Trying to update a non existing Area!");
        }
        this.newConfig = structuredClone(config.dataToModify);
        this.oldConfig = structuredClone(oldConfig);
    }

    public execute(): UpdateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas()?.updateArea(this.newConfig.id, this.newConfig)) {
            throw new Error(`MapEditorError: Could not execute UpdateArea Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: "UpdateAreaCommand", dataToModify: this.newConfig };
    }

    public undo(): UpdateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas()?.updateArea(this.oldConfig.id, this.oldConfig)) {
            throw new Error(`MapEditorError: Could not undo UpdateArea Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: "UpdateAreaCommand", dataToModify: this.oldConfig };
    }
}
