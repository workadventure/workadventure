import { UploadFileMessage } from "@workadventure/messages";
import { Command } from "../Command";

export class UploadFileCommand extends Command {
    protected uploadFileMessage: UploadFileMessage;
    protected hostname: string | undefined;

    constructor(uploadFileMessage: UploadFileMessage, hostname?: string) {
        super();
        this.uploadFileMessage = uploadFileMessage;
        this.hostname = hostname;
    }

    execute(): Promise<void> {
        return Promise.resolve();
    }
}
