import type { Command } from "@workadventure/map-editor";
import { UploadFileCommand } from "@workadventure/map-editor";
import type { UploadFileMessage } from "@workadventure/messages";
import type { RoomConnection } from "../../../../../Connection/RoomConnection";
import type { FrontCommand } from "../FrontCommand.ts";
import type { FrontCommandInterface } from "../FrontCommandInterface.ts";
import { VoidFrontCommand } from "../VoidFrontCommand.ts";

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
