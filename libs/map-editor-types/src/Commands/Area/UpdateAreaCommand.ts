import { GameMap } from '../../../../../front/src/Phaser/Game/GameMap';
import { AreaType } from '../../../../../front/src/Phaser/Game/GameMapAreas';
import { CommandPayload, CommandType, ITiledMapRectangleObject } from '../../types';
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
        const oldConfig = gameMap.getArea(payload.config.id, AreaType.Static);
        if (!oldConfig) {
            throw new Error('Trying to update a non existing Area!');
        }
        this.newConfig = { ...payload.config };
        this.oldConfig = { ...oldConfig };
    }

    public execute(): [CommandType, CommandPayload] {
        this.gameMap.updateAreaById(this.newConfig.id, AreaType.Static, this.newConfig);
        return [CommandType.UpdateAreaCommand, { config: this.newConfig }];
    }

    public undo(): [CommandType, CommandPayload] {
        this.gameMap.updateAreaById(this.oldConfig.id, AreaType.Static, this.oldConfig);
        return [CommandType.UpdateAreaCommand, { config: this.oldConfig }];
    }
}
