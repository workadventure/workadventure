import type { AtLeast, EntityData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export interface UpdateEntityCommandConfig {
    type: "UpdateEntityCommand";
    dataToModify: AtLeast<EntityData, "id">;
}

export class UpdateEntityCommand extends Command {
    private oldConfig: AtLeast<EntityData, "id">;
    private newConfig: AtLeast<EntityData, "id">;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: UpdateEntityCommandConfig, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        const oldConfig = gameMap.getGameMapEntities()?.getEntity(config.dataToModify.id);
        if (!oldConfig) {
            throw new Error("Trying to update a non existing Entity!");
        }
        this.newConfig = structuredClone(config.dataToModify);
        this.oldConfig = structuredClone(oldConfig);
    }

    public execute(): UpdateEntityCommandConfig {
        if (!this.gameMap.getGameMapEntities()?.updateEntity(this.newConfig.id, this.newConfig)) {
            throw new Error(`MapEditorError: Could not execute UpdateEntity Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: "UpdateEntityCommand", dataToModify: this.newConfig };
    }

    public undo(): UpdateEntityCommandConfig {
        if (!this.gameMap.getGameMapEntities()?.updateEntity(this.oldConfig.id, this.oldConfig)) {
            throw new Error(`MapEditorError: Could not undo UpdateEntity Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: "UpdateEntityCommand", dataToModify: this.oldConfig };
    }
}
