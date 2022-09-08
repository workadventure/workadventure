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
        this.areaConfig = {
            ...config.areaObjectConfig,
        };
    }

    public execute(): CreateAreaCommandConfig {
        console.log('EXECUTE CREATE COMMAND');
        this.gameMap.getGameMapAreas().addArea(this.areaConfig, AreaType.Static);
        return { type: 'CreateAreaCommand', areaObjectConfig: this.areaConfig };
    }

    public undo(): DeleteAreaCommandConfig {
        this.gameMap.getGameMapAreas().deleteAreaById(this.areaConfig.id, AreaType.Static);
        return { type: 'DeleteAreaCommand', id: this.areaConfig.id };
    }
}
