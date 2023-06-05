import type { AtLeast, EntityData } from "../../types";
import type { GameMap } from "../../GameMap/GameMap";
import { Command } from "../Command";

export class UpdateEntityCommand extends Command {
    protected oldConfig: AtLeast<EntityData, "id">;
    protected newConfig: AtLeast<EntityData, "id">;

    protected gameMap: GameMap;

    constructor(
        gameMap: GameMap,
        dataToModify: AtLeast<EntityData, "id">,
        commandId?: string,
        oldConfig?: AtLeast<EntityData, "id">
    ) {
        super(commandId);
        this.gameMap = gameMap;
        if (!oldConfig) {
            const oldConfig = gameMap.getGameMapEntities()?.getEntity(dataToModify.id);
            if (!oldConfig) {
                throw new Error("Trying to update a non existing Entity!");
            }
            this.oldConfig = structuredClone(oldConfig);
        } else {
            this.oldConfig = structuredClone(oldConfig);
        }
        this.newConfig = structuredClone(dataToModify);
    }

    public execute(): Promise<void> {
        if (!this.gameMap.getGameMapEntities()?.updateEntity(this.newConfig.id, this.newConfig)) {
            throw new Error(`MapEditorError: Could not execute UpdateEntity Command. Entity ID: ${this.newConfig.id}`);
        }
        return Promise.resolve();
    }
}
