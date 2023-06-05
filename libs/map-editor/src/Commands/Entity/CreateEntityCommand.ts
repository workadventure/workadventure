import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";
import { WAMEntityData } from "../../types";

export class CreateEntityCommand extends Command {
    protected entityData: WAMEntityData;

    protected gameMap: GameMap;

    constructor(gameMap: GameMap, entityData: WAMEntityData, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        this.entityData = structuredClone(entityData);
    }

    public execute(): Promise<void> {
        if (!this.gameMap.getGameMapEntities()?.addEntity(this.entityData)) {
            throw new Error(`MapEditorError: Could not execute CreateEntity Command. Entity ID: ${this.entityData.id}`);
        }
        return Promise.resolve();
    }
}
