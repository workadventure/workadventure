import { GameMap } from '../../GameMap/GameMap';
import { AreaType, ITiledMapRectangleObject } from '../../types';
import { Command } from "../Command";

export interface UpdateAreaCommandConfig {
    type: "UpdateAreaCommand";
    areaObjectConfig: ITiledMapRectangleObject;
}

export class UpdateAreaCommand extends Command {
    private oldConfig: ITiledMapRectangleObject;
    private newConfig: ITiledMapRectangleObject;

    private gameMap: GameMap;
    
    constructor(gameMap: GameMap, config: UpdateAreaCommandConfig) {
        super();
        this.gameMap = gameMap;
        const oldConfig = gameMap.getGameMapAreas().getArea(config.areaObjectConfig.id, AreaType.Static);
        if (!oldConfig) {
            throw new Error('Trying to update a non existing Area!');
        }
        this.newConfig = { ...config.areaObjectConfig };
        this.oldConfig = { ...oldConfig };
    }

    public execute(): UpdateAreaCommandConfig {
        this.gameMap.getGameMapAreas().updateAreaById(this.newConfig.id, AreaType.Static, this.newConfig);
        return { type: 'UpdateAreaCommand', areaObjectConfig: this.newConfig };
    }

    public undo(): UpdateAreaCommandConfig {
        this.gameMap.getGameMapAreas().updateAreaById(this.oldConfig.id, AreaType.Static, this.oldConfig);
        return { type: 'UpdateAreaCommand', areaObjectConfig: this.oldConfig };
    }
}
