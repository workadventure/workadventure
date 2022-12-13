import type { EntityData } from '../../types';
import type { GameMap } from '../../GameMap/GameMap';
import { Command } from "../Command";

export interface UpdateEntityCommandConfig {
    type: "UpdateEntityCommand";
    entityData: EntityData;
}

export class UpdateEntityCommand extends Command {
    private oldConfig: EntityData;
    private newConfig: EntityData;

    private gameMap: GameMap;

    constructor(gameMap: GameMap, config: UpdateEntityCommandConfig) {
        super();
        this.gameMap = gameMap;
        const oldConfig = gameMap.getGameMapEntities().getEntity(config.entityData.id);
        if (!oldConfig) {
            throw new Error('Trying to update a non existing Entity!');
        }
        this.newConfig = structuredClone(config.entityData);
        this.oldConfig = structuredClone(oldConfig);
    }

    public execute(): UpdateEntityCommandConfig {
        if (!this.gameMap.getGameMapEntities().updateEntity(this.newConfig.id, this.newConfig)) {
            throw new Error(`MapEditorError: Could not execute UpdateEntity Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: 'UpdateEntityCommand', entityData: this.newConfig };
    }

    public undo(): UpdateEntityCommandConfig {
        if (!this.gameMap.getGameMapEntities().updateEntity(this.oldConfig.id, this.oldConfig)) {
            throw new Error(`MapEditorError: Could not undo UpdateEntity Command. Area ID: ${this.newConfig.id}`);
        }
        return { type: 'UpdateEntityCommand', entityData: this.oldConfig };
    }
}
