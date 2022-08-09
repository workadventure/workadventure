import { GameMap } from '../../GameMap/GameMap';
import { AreaType, CommandPayload, CommandType, ITiledMapRectangleObject } from '../../types';
import { Command } from "../Command";

export interface UpdateAreaCommandPayload {
    config: ITiledMapRectangleObject;
}

export class UpdateAreaCommand extends Command {
    private oldConfig: ITiledMapRectangleObject;
    private newConfig: ITiledMapRectangleObject;

    // TODO: Get GameMap as a Phaserless type from the lib
    private gameMap: GameMap;
    
    constructor(gameMap: GameMap, payload: UpdateAreaCommandPayload) {
        super();
        this.gameMap = gameMap;
        const oldConfig = gameMap.getGameMapAreas().getArea(payload.config.id, AreaType.Static);
        if (!oldConfig) {
            throw new Error('Trying to update a non existing Area!');
        }
        this.newConfig = { ...payload.config };
        this.oldConfig = { ...oldConfig };
    }

    public execute(): [CommandType, CommandPayload] {
        this.gameMap.getGameMapAreas().updateAreaById(this.newConfig.id, AreaType.Static, this.newConfig);
        return [CommandType.UpdateAreaCommand, { config: this.newConfig }];
    }

    public undo(): [CommandType, CommandPayload] {
        this.gameMap.getGameMapAreas().updateAreaById(this.oldConfig.id, AreaType.Static, this.oldConfig);
        return [CommandType.UpdateAreaCommand, { config: this.oldConfig }];
    }
}
