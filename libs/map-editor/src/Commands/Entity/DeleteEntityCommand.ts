import type { GameMap } from "../../GameMap/GameMap";
import type { WAMEntityData } from "../../types";
import { Command } from "../Command";

export class DeleteEntityCommand extends Command {
    protected entityConfig: WAMEntityData | undefined;

    protected gameMap: GameMap;

    constructor(gameMap: GameMap, protected entityId: string, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
    }

    public execute(): Promise<void> {
        const entityConfig = this.gameMap.getGameMapEntities()?.getEntity(this.entityId);
        if (entityConfig) {
            this.entityConfig = structuredClone(entityConfig);
            if (!this.gameMap.getGameMapEntities()?.deleteEntity(this.entityId)) {
                throw new Error(`MapEditorError: Could not execute DeleteEntity Command. Entity ID: ${this.entityId}`);
            }
        }
        return Promise.resolve();
    }
}
