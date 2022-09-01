import { GameMap } from '../../GameMap/GameMap';
import { AreaType, ITiledMapRectangleObject } from '../../types';
import { Command } from "../Command";

export interface DeleteAreaCommandConfig {
    type: "DeleteAreaCommand";
    id: number;
}

export class UpdateAreaCommand extends Command {
    private oldConfig: ITiledMapRectangleObject;

    private gameMap: GameMap;
    
    constructor(gameMap: GameMap, config: DeleteAreaCommandConfig) {
        super();
        this.gameMap = gameMap;
        const oldConfig = gameMap.getGameMapAreas().getArea(config.id, AreaType.Static);
        if (!oldConfig) {
            throw new Error('Trying to delete a non existing Area!');
        }
        this.oldConfig = { ...oldConfig };
    }

    public execute(): DeleteAreaCommandConfig {
        this.gameMap.getGameMapAreas().deleteAreaById(this.oldConfig.id, AreaType.Static);
        return { type: 'DeleteAreaCommand', id: this.oldConfig.id };
    }

    public undo(): DeleteAreaCommandConfig {
        this.gameMap.getGameMapAreas().addArea(this.oldConfig, AreaType.Static);
        return { type: 'UpdateAreaCommand', areaObjectConfig: this.oldConfig };
    }
}
