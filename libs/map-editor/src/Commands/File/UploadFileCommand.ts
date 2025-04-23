//import { UploadFileMessage } from "@workadventure/messages";
import { Command } from "../Command";

export class UploadFileCommand extends Command {
    //protected uploadfileMessage: UploadFileMessage;
    protected hostname: string | undefined;

    constructor(/*uploadEntityMessage: UploadFileMessage,*/ hostname?: string) {
        super();
        //this.uploadFileMessage = uploadFileMessage;
        this.hostname = hostname;
    }

    execute(): Promise<void> {
        return Promise.resolve();
    }
}
