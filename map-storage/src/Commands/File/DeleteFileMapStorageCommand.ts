import { DeleteFileCommand } from "@workadventure/map-editor";
import { DeleteFileMessage } from "@workadventure/messages";
import { FileDeleteService } from "../../Services/FileDeleteService";

export class DeleteFileMapStorageCommand extends DeleteFileCommand {
    private fileDeleteService: FileDeleteService;

    constructor(deleteFileMessage: DeleteFileMessage, hostName: string) {
        super(deleteFileMessage, hostName);
        this.fileDeleteService = new FileDeleteService(hostName);
    }
    async execute(): Promise<void> {
        await super.execute();
        return this.fileDeleteService.deleteFile(this.deleteFileMessage);
    }
}
