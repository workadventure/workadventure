import { ITiledMapRectangleObject } from '@workadventure/map-editor-types';
import { AreaType } from '../../../GameMapAreas';
import { GameScene } from '../../../GameScene';
import { CommandPayload, CommandType } from '../../MapEditorModeManager';
import { AreaEditorTool } from '../../Tools/AreaEditorTool';
import { Command } from "../Command";

export interface UpdateAreaCommandPayload {
    config: ITiledMapRectangleObject;
}

export class UpdateAreaCommand extends Command {
    private oldConfig: ITiledMapRectangleObject;
    private newConfig: ITiledMapRectangleObject;
    
    private scene: GameScene;
    private areaEditorTool: AreaEditorTool;

    constructor(scene: GameScene, areaEditorTool: AreaEditorTool, payload: UpdateAreaCommandPayload) {
        super();
        this.scene = scene;
        this.areaEditorTool = areaEditorTool;
        const oldConfig = this.areaEditorTool.getAreaPreviewConfig(payload.config.id);
        if (!oldConfig) {
            throw new Error('Trying to update a non existing Area!');
        }
        this.newConfig = { ...payload.config };
        this.oldConfig = oldConfig;
    }

    public execute(): [CommandType, CommandPayload] {
        this.areaEditorTool.updateAreaPreview(this.newConfig);
        this.scene.getGameMap().updateAreaById(this.newConfig.id, AreaType.Static, this.newConfig);
        this.scene.markDirty();
        return [CommandType.UpdateAreaCommand, { config: this.newConfig }];
    }

    public undo(): [CommandType, CommandPayload] {
        this.areaEditorTool.updateAreaPreview(this.oldConfig);
        this.scene.getGameMap().updateAreaById(this.oldConfig.id, AreaType.Static, this.oldConfig);
        this.scene.markDirty();
        return [CommandType.UpdateAreaCommand, { config: this.oldConfig }];
    }
}
