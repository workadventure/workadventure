import { ModifyCustomEntityCommand } from "@workadventure/map-editor";
import { ModifyCustomEntityMessage } from "@workadventure/messages";
import { FrontCommand } from "../FrontCommand";
import { RoomConnection } from "../../../../../Connection/RoomConnection";

export class ModifyCustomEntityFrontCommand extends ModifyCustomEntityCommand implements FrontCommand {
    constructor(modifyCustomEntityMessage: ModifyCustomEntityMessage) {
        super(modifyCustomEntityMessage);
    }

    emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorModifyCustomEntity(this.commandId, this.modifyCustomEntityMessage);
    }

    execute(): Promise<void> {
        //TODO put execution here
        return Promise.resolve();
    }

    getUndoCommand(): ModifyCustomEntityFrontCommand {
        return new ModifyCustomEntityFrontCommand(this.modifyCustomEntityMessage);
    }
}
