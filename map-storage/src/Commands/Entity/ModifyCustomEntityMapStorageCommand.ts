import { ModifyCustomEntityCommand } from "@workadventure/map-editor";
import { ModifyCustomEntityMessage } from "@workadventure/messages";
import { CustomEntityCollectionService } from "../../Services/CustomEntityCollectionService";

export class ModifyCustomEntityMapStorageCommand extends ModifyCustomEntityCommand {
    private customEntityCollectionService: CustomEntityCollectionService;

    constructor(modifyCustomEntityMessage: ModifyCustomEntityMessage, hostName: string) {
        super(modifyCustomEntityMessage, hostName);
        this.customEntityCollectionService = new CustomEntityCollectionService(hostName);
    }
    async execute(): Promise<void> {
        await super.execute();
        return this.customEntityCollectionService.modifyEntity(this.modifyCustomEntityMessage);
    }
}
