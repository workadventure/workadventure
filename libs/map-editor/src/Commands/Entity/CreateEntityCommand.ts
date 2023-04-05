import type { EntityData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";
import type { DeleteEntityCommandConfig } from "./DeleteEntityCommand";

export interface CreateEntityCommandConfig {
    type: "CreateEntityCommand";
    entityData: EntityData;
}

export class CreateEntityCommand extends Command {
    private entityData: EntityData;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: CreateEntityCommandConfig, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        this.entityData = structuredClone(config.entityData);
    }

    public execute(): CreateEntityCommandConfig {
        if (!this.gameMap.getGameMapEntities()?.addEntity(this.entityData)) {
            throw new Error(`MapEditorError: Could not execute CreateEntity Command. Entity ID: ${this.entityData.id}`);
        }
        return { type: "CreateEntityCommand", entityData: this.entityData };
    }

    public undo(): DeleteEntityCommandConfig {
        if (!this.gameMap.getGameMapEntities()?.deleteEntity(this.entityData.id)) {
            throw new Error(`MapEditorError: Could not undo CreateEntity Command. Entity ID: ${this.entityData.id}`);
        }
        return { type: "DeleteEntityCommand", id: this.entityData.id };
    }
}
