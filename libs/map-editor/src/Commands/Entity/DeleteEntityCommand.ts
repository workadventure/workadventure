import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export class DeleteEntityCommand extends Command {
    protected gameMap: GameMap;

    constructor(gameMap: GameMap, protected entityId: string, commandId?: string) {
        super(commandId);
        this.gameMap = gameMap;
    }

    public execute(): Promise<void> {
        if (!this.gameMap.getGameMapEntities()?.deleteEntity(this.entityId)) {
            throw new Error(`MapEditorError: Could not execute DeleteEntity Command. Entity ID: ${this.entityId}`);
        }
        return Promise.resolve();
    }
}
