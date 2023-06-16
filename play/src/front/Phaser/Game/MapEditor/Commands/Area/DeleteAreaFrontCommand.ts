import { DeleteAreaCommand, GameMap } from "@workadventure/map-editor";
import { AreaEditorTool } from "../../Tools/AreaEditorTool";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connexion/RoomConnection";
import { VoidFrontCommand } from "../VoidFrontCommand";
import { CreateAreaFrontCommand } from "./CreateAreaFrontCommand";

export class DeleteAreaFrontCommand extends DeleteAreaCommand implements FrontCommandInterface {
    constructor(
        gameMap: GameMap,
        areaId: string,
        commandId: string | undefined,
        private areaEditorTool: AreaEditorTool,
        private localCommand: boolean
    ) {
        super(gameMap, areaId, commandId);
    }

    public execute(): Promise<void> {
        const returnVal = super.execute();
        this.areaEditorTool.handleAreaPreviewDeletion(this.areaId);

        return returnVal;
    }

    public getUndoCommand(): CreateAreaFrontCommand | VoidFrontCommand {
        if (!this.areaConfig) {
            return new VoidFrontCommand();
        }
        return new CreateAreaFrontCommand(this.gameMap, this.areaConfig, undefined, this.areaEditorTool, false);
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorDeleteArea(this.commandId, this.areaId);
    }
}
