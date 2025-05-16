import { UploadFileCommand } from "@workadventure/map-editor";
import { UploadFileMessage } from "@workadventure/messages";
import { CustomFileService } from "./../../Services/CustomFileService";

export class UploadFileMapStorageCommand extends UploadFileCommand {
    private fileUploadService: CustomFileService;

    constructor(uploadFileMessage: UploadFileMessage, hostName: string) {
        super(uploadFileMessage, hostName);
        this.fileUploadService = new CustomFileService(hostName);
    }
    async execute(): Promise<void> {
        await super.execute();
        return this.fileUploadService.uploadFile(this.uploadFileMessage);
    }
}
