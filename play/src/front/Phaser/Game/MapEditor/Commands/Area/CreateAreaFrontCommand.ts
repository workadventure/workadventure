import { AreaData, CreateAreaCommand, GameMap } from "@workadventure/map-editor";
import { AreaEditorTool } from "../../Tools/AreaEditorTool";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { TrashEditorTool } from "../../Tools/TrashEditorTool";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { GameMapFrontWrapper } from "../../../GameMap/GameMapFrontWrapper";
import { DeleteAreaFrontCommand } from "./DeleteAreaFrontCommand";

export class CreateAreaFrontCommand extends CreateAreaCommand implements FrontCommandInterface {
    constructor(
        gameMap: GameMap,
        areaObjectConfig: AreaData,
        commandId: string | undefined,
        private areaEditorTool: AreaEditorTool | TrashEditorTool,
        private localCommand: boolean,
        private gameMapFrontWrapper: GameMapFrontWrapper
    ) {
        super(gameMap, areaObjectConfig, commandId);
    }

    public async execute(): Promise<void> {
        await super.execute();
        this.areaEditorTool.handleAreaCreation(this.areaConfig, this.localCommand);
        this.gameMapFrontWrapper.recomputeAreasCollisionGrid();
    }

    public getUndoCommand(): DeleteAreaFrontCommand {
        return new DeleteAreaFrontCommand(
            this.gameMap,
            this.areaConfig.id,
            undefined,
            this.areaEditorTool,
            this.gameMapFrontWrapper
        );
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorCreateArea(this.commandId, this.areaConfig);
    }
}
