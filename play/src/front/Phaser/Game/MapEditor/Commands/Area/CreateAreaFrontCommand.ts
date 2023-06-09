import { AreaData, CreateAreaCommand, GameMap } from "@workadventure/map-editor";
import { AreaEditorTool } from "../../Tools/AreaEditorTool";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { RoomConnection } from "../../../../../Connexion/RoomConnection";
import { DeleteAreaFrontCommand } from "./DeleteAreaFrontCommand";

export class CreateAreaFrontCommand extends CreateAreaCommand implements FrontCommandInterface {
    constructor(
        gameMap: GameMap,
        areaObjectConfig: AreaData,
        commandId: string | undefined,
        private areaEditorTool: AreaEditorTool,
        private localCommand: boolean
    ) {
        super(gameMap, areaObjectConfig, commandId);
    }

    public async execute(): Promise<void> {
        await super.execute();
        this.areaEditorTool.handleAreaPreviewCreation(this.areaConfig, this.localCommand);
    }

    public getUndoCommand(): DeleteAreaFrontCommand {
        return new DeleteAreaFrontCommand(this.gameMap, this.areaConfig.id, undefined, this.areaEditorTool, false);
    }

    public emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorCreateArea(this.id, this.areaConfig);
    }
}
