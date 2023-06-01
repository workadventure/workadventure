import type { WAMEntityData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";
import type { CreateEntityCommandConfig } from "./CreateEntityCommand";

export interface DeleteEntityCommandConfig {
    type: "DeleteEntityCommand";
    id: string;
}

export class DeleteEntityCommand extends Command {
    private entityData: WAMEntityData;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: DeleteEntityCommandConfig, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        const entityData = gameMap.getGameMapEntities()?.getEntity(config.id);
        if (!entityData) {
            throw new Error("Trying to delete a non existing Entity!");
        }
        this.entityData = structuredClone(entityData);
    }

    public execute(): DeleteEntityCommandConfig {
        if (!this.gameMap.getGameMapEntities()?.deleteEntity(this.entityData.id)) {
            throw new Error(`MapEditorError: Could not execute DeleteEntity Command. Entity ID: ${this.entityData.id}`);
        }
        return { type: "DeleteEntityCommand", id: this.entityData.id };
    }

    public undo(): CreateEntityCommandConfig {
        if (!this.gameMap.getGameMapEntities()?.addEntity(this.entityData)) {
            throw new Error(`MapEditorError: Could not undo DeleteEntity Command. Entity ID: ${this.entityData.id}`);
        }
        return { type: "CreateEntityCommand", entityData: this.entityData };
    }
}
