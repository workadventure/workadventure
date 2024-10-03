import { DeleteCustomEntityCommand, GameMap } from "@workadventure/map-editor";
import { DeleteCustomEntityMessage } from "@workadventure/messages";
import { CustomEntityCollectionService } from "../../Services/CustomEntityCollectionService";

export class DeleteCustomEntityMapStorageCommand extends DeleteCustomEntityCommand {
    private customEntityCollectionService: CustomEntityCollectionService;

    constructor(deleteCustomEntityMessage: DeleteCustomEntityMessage, gameMap: GameMap, hostName: string) {
        super(deleteCustomEntityMessage, gameMap, hostName);
        this.customEntityCollectionService = new CustomEntityCollectionService(hostName);
    }
    async execute(): Promise<void> {
        await super.execute();
        return this.customEntityCollectionService.deleteEntity(this.deleteCustomEntityMessage);
    }
}
