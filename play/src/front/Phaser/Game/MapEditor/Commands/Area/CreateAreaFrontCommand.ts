import type { AreaData, WamFile } from "@workadventure/map-editor";
import { CreateAreaCommand } from "@workadventure/map-editor";
import type { AreaEditorTool } from "../../Tools/AreaEditorTool";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import type { TrashEditorTool } from "../../Tools/TrashEditorTool";
import type { RoomConnection } from "../../../../../Connection/RoomConnection";
import type { GameMapFrontWrapper } from "../../../GameMap/GameMapFrontWrapper";
import { DeleteAreaFrontCommand } from "./DeleteAreaFrontCommand";

export class CreateAreaFrontCommand extends CreateAreaCommand implements FrontCommandInterface {
    constructor(
        wamFile: WamFile,
        areaObjectConfig: AreaData,
        commandId: string | undefined,
        private areaEditorTool: AreaEditorTool | TrashEditorTool,
        private localCommand: boolean,
        private gameMapFrontWrapper: GameMapFrontWrapper
    ) {
        super(wamFile, areaObjectConfig, commandId);
    }

    public async execute(): Promise<void> {
        await super.execute();
        this.areaEditorTool.handleAreaCreation(this.areaConfig, this.localCommand);
        this.gameMapFrontWrapper.recomputeAreasCollisionGrid();
    }

    public getUndoCommand(): DeleteAreaFrontCommand {
        return new DeleteAreaFrontCommand(
            this.wamFile,
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
