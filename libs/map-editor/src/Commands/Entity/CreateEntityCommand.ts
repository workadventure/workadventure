import { v4 } from "uuid";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";
import { WAMEntityData } from "../../types";

export class CreateEntityCommand extends Command {
    protected entityId: string;
    protected entityData: WAMEntityData;

    protected gameMap: GameMap;

    constructor(gameMap: GameMap, entityId: string | undefined, entityData: WAMEntityData, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
        this.entityData = structuredClone(entityData);
        this.entityId = entityId ?? v4();
    }

    public execute(): Promise<void> {
        this.gameMap.getGameMapEntities()?.addEntity(this.entityId, this.entityData);
        return Promise.resolve();
    }
}
