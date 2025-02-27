import { AreaData, AtLeast, GameMap, UpdateAreaCommand } from "@workadventure/map-editor";
import { AreaEditorTool } from "../../Tools/AreaEditorTool";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { GameMapFrontWrapper } from "../../../GameMap/GameMapFrontWrapper";

export class UpdateAreaFrontCommand extends UpdateAreaCommand implements FrontCommandInterface {
    constructor(
        gameMap: GameMap,
        dataToModify: AtLeast<AreaData, "id">,
        commandId: string | undefined,
        oldConfig: AtLeast<AreaData, "id"> | undefined,
        private areaEditorTool: AreaEditorTool,
        private gameMapFrontWrapper: GameMapFrontWrapper
    ) {
        super(gameMap, dataToModify, commandId, oldConfig);
    }

    public async execute(): Promise<void> {
        const returnVal = await super.execute();
        this.areaEditorTool.handleAreaUpdate(this.oldConfig, this.newConfig);

        this.gameMapFrontWrapper.recomputeAreasCollisionGrid();

        return returnVal;
    }

    public getUndoCommand(): UpdateAreaFrontCommand {
        return new UpdateAreaFrontCommand(
            this.gameMap,
            this.oldConfig,
            undefined,
            this.newConfig,
            this.areaEditorTool,
            this.gameMapFrontWrapper
        );
    }

    public setNewConfig(newConfig: AtLeast<AreaData, "id">): void {
        this.newConfig = newConfig;
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorModifyArea(this.commandId, this.newConfig);
    }
}
