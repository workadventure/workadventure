import { Command, UploadFileCommand } from "@workadventure/map-editor";
import { UploadFileMessage } from "@workadventure/messages";
import { RoomConnection } from "../../../../../Connection/RoomConnection";
import { FrontCommand } from "../FrontCommand";
import { FrontCommandInterface } from "../FrontCommandInterface";
import { VoidFrontCommand } from "../VoidFrontCommand";

export class UploadFileFrontCommand extends UploadFileCommand implements FrontCommand {
    constructor(uploadFileMessage: UploadFileMessage) {
        super(uploadFileMessage);
    }

    emitEvent(roomConnection: RoomConnection): void {
        roomConnection.emitMapEditorUploadFile(this.commandId, this.uploadFileMessage);
    }

    execute(): Promise<void> {
        return super.execute();
    }

    getUndoCommand(): Command & FrontCommandInterface {
        return new VoidFrontCommand();
    }
}
