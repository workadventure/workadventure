import { DeleteAreaCommand, GameMap } from "@workadventure/map-editor";
import { AreaEditorTool } from "../../Tools/AreaEditorTool";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { CreateAreaFrontCommand } from "./CreateAreaFrontCommand";

export class DeleteAreaFrontCommand extends DeleteAreaCommand implements FrontCommandInterface {
    constructor(
        gameMap: GameMap,
        id: string,
        commandId: string | undefined,
        private areaEditorTool: AreaEditorTool,
        private localCommand: boolean
    ) {
        super(gameMap, id, commandId);
    }

    public async execute(): Promise<void> {
        const returnVal = super.execute();
        this.areaEditorTool.handleAreaPreviewDeletion(this.areaConfig.id);

        return returnVal;
    }

    public getUndoCommand(): CreateAreaFrontCommand {
        return new CreateAreaFrontCommand(this.gameMap, this.areaConfig, undefined, this.areaEditorTool, false);
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorDeleteArea(this.id, this.areaConfig.id);
    }
}
