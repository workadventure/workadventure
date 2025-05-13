import { DeleteFileMessage } from "@workadventure/messages";
import { Command } from "../Command";

export class DeleteFileCommand extends Command {
    protected deleteFileMessage: DeleteFileMessage;
    protected hostname: string | undefined;

    constructor(deleteFileMessage: DeleteFileMessage, hostname?: string) {
        super();
        this.deleteFileMessage = deleteFileMessage;
        this.hostname = hostname;
    }

    execute(): Promise<void> {
        return Promise.resolve();
    }
}
