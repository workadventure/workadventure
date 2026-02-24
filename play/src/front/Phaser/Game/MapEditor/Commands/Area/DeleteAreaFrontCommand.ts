import type { WamFile } from "@workadventure/map-editor";
import { DeleteAreaCommand } from "@workadventure/map-editor";
import type { AreaEditorTool } from "../../Tools/AreaEditorTool";
import type { FrontCommandInterface } from "../FrontCommandInterface";
import type { RoomConnection } from "../../../../../Connection/RoomConnection";
import type { TrashEditorTool } from "../../Tools/TrashEditorTool";
import { VoidFrontCommand } from "../VoidFrontCommand";
import type { GameMapFrontWrapper } from "../../../GameMap/GameMapFrontWrapper";
import { CreateAreaFrontCommand } from "./CreateAreaFrontCommand";

export class DeleteAreaFrontCommand extends DeleteAreaCommand implements FrontCommandInterface {
    constructor(
        wamFile: WamFile,
        areaId: string,
        commandId: string | undefined,
        private editorTool: AreaEditorTool | TrashEditorTool,
        private gameMapFrontWrapper: GameMapFrontWrapper
    ) {
        super(wamFile, areaId, commandId);
    }

    public execute(): Promise<void> {
        const area = this.wamFile.getGameMapAreas().getArea(this.areaId);
        const returnVal = super.execute();

        this.editorTool.handleAreaDeletion(this.areaId, area);

        this.gameMapFrontWrapper.recomputeAreasCollisionGrid();

        return returnVal;
    }

    public getUndoCommand(): CreateAreaFrontCommand | VoidFrontCommand {
        if (!this.areaConfig) {
            return new VoidFrontCommand();
        }
        return new CreateAreaFrontCommand(
            this.wamFile,
            this.areaConfig,
            undefined,
            this.editorTool,
            false,
            this.gameMapFrontWrapper
        );
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorDeleteArea(this.commandId, this.areaId);
    }
}
