import { UploadEntityCommand } from "@workadventure/map-editor";
import { UploadEntityMessage } from "@workadventure/messages";
import { CustomEntityCollectionService } from "../../Services/CustomEntityCollectionService";

export class UploadEntityMapStorageCommand extends UploadEntityCommand {
    private customEntityCollectionService: CustomEntityCollectionService;

    constructor(uploadEntityMessage: UploadEntityMessage, hostName: string) {
        super(uploadEntityMessage, hostName);
        this.customEntityCollectionService = new CustomEntityCollectionService(hostName);
    }
    async execute(): Promise<void> {
        await super.execute();
        return this.customEntityCollectionService.uploadEntity(this.uploadEntityMessage);
    }
}
