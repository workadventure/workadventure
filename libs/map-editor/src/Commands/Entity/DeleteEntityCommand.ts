import type { WAMEntityData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export class DeleteEntityCommand extends Command {
    protected entityData: WAMEntityData;

    protected gameMap: GameMap;

    constructor(gameMap: GameMap, id: string, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        const entityData = gameMap.getGameMapEntities()?.getEntity(id);
        if (!entityData) {
            throw new Error("Trying to delete a non existing Entity!");
        }
        this.entityData = structuredClone(entityData);
    }

    public execute(): Promise<void> {
        if (!this.gameMap.getGameMapEntities()?.deleteEntity(this.entityData.id)) {
            throw new Error(`MapEditorError: Could not execute DeleteEntity Command. Entity ID: ${this.entityData.id}`);
        }
        return Promise.resolve();
    }
}
