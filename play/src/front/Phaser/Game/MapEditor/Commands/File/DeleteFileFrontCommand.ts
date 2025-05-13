import { Command, DeleteFileCommand } from "@workadventure/map-editor";
import { DeleteFileMessage } from "@workadventure/messages";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { FrontCommand } from "../FrontCommand";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { VoidFrontCommand } from "../VoidFrontCommand";

export class DeleteFileFrontCommand extends DeleteFileCommand implements FrontCommand {
    constructor(deleteFileMessage: DeleteFileMessage) {
        super(deleteFileMessage);
    }

    emitEvent(roomConnection: RoomConnection): void {
        console.log("DeleteFileFrontCommand emitEvent", this.commandId, this.deleteFileMessage);
        roomConnection.emitMapEditorDeleteFile(this.commandId, this.deleteFileMessage);
    }

    execute(): Promise<void> {
        return super.execute();
    }

    getUndoCommand(): Command & FrontCommandInterface {
        return new VoidFrontCommand();
    }
}
