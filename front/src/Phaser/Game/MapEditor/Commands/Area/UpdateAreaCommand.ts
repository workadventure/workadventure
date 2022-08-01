import { ITiledMapRectangleObject } from '@workadventure/map-editor-types';
import { AreaType } from '../../../GameMapAreas';
import { GameScene } from '../../../GameScene';
import { CommandPayload, CommandType } from '../../MapEditorModeManager';
import { Command } from "../Command";

export interface UpdateAreaCommandPayload {
    config: ITiledMapRectangleObject;
}

export class UpdateAreaCommand extends Command {
    private oldConfig: ITiledMapRectangleObject;
    private newConfig: ITiledMapRectangleObject;
    
    private scene: GameScene;

    constructor(scene: GameScene, payload: UpdateAreaCommandPayload) {
        super();
        this.scene = scene;
        const oldConfig = this.scene.getGameMap().getArea(payload.config.id, AreaType.Static);
        if (!oldConfig) {
            throw new Error('Trying to update a non existing Area!');
        }
        this.newConfig = { ...payload.config };
        this.oldConfig = { ...oldConfig };
    }

    public execute(): [CommandType, CommandPayload] {
        this.scene.getGameMap().updateAreaById(this.newConfig.id, AreaType.Static, this.newConfig);
        return [CommandType.UpdateAreaCommand, { config: this.newConfig }];
    }

    public undo(): [CommandType, CommandPayload] {
        this.scene.getGameMap().updateAreaById(this.oldConfig.id, AreaType.Static, this.oldConfig);
        return [CommandType.UpdateAreaCommand, { config: this.oldConfig }];
    }
}
