import { GameMap } from '../../GameMap/GameMap';
import { AreaType, ITiledMapRectangleObject } from '../../types';
import { Command } from "../Command";
import { DeleteAreaCommandConfig } from './DeleteAreaCommand';

export interface CreateAreaCommandConfig {
    type: "CreateAreaCommand";
    areaObjectConfig: ITiledMapRectangleObject;
}

export class CreateAreaCommand extends Command {
    private areaConfig: ITiledMapRectangleObject;

    private gameMap: GameMap;
    
    constructor(gameMap: GameMap, config: CreateAreaCommandConfig) {
        super();
        this.gameMap = gameMap;
        this.areaConfig = structuredClone(config.areaObjectConfig);
    }

    public execute(): CreateAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas().addArea(this.areaConfig, AreaType.Static)) {
            throw new Error(`MapEditorError: Could not execute CreateArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return { type: 'CreateAreaCommand', areaObjectConfig: this.areaConfig };
    }

    public undo(): DeleteAreaCommandConfig {
        if (!this.gameMap.getGameMapAreas().deleteAreaById(this.areaConfig.id, AreaType.Static)) {
            throw new Error(`MapEditorError: Could not undo CreateArea Command. Area ID: ${this.areaConfig.id}`);
        }
        return { type: 'DeleteAreaCommand', id: this.areaConfig.id };
    }
}
