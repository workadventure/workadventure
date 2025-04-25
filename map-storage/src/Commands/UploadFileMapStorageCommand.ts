import { UploadFileCommand } from "@workadventure/map-editor";
import { UploadFileMessage } from "@workadventure/messages";
import { FileUploadService } from "../Services/FileUploadService";

export class UploadFileMapStorageCommand extends UploadFileCommand {
    private fileUploadService: FileUploadService;

    constructor(uploadFileMessage: UploadFileMessage, hostName: string) {
        super(uploadFileMessage, hostName);
        this.fileUploadService = new FileUploadService(hostName);
    }
    async execute(): Promise<void> {
        await super.execute();
        return this.fileUploadService.uploadFile(this.uploadFileMessage);
    }
}
