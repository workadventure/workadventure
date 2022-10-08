import type {CompanionCollectionList} from "../../messages/JsonMessages/CompanionTextures";
import type {CompanionService} from "./CompanionService";

/**
 * Companion Service list that the default list of companions
 */
export class LocalCompanionSevice implements CompanionService {
    async getCompanionList(roomUrl: string, token: string): Promise<CompanionCollectionList | undefined> {
        const defaultCompanionList: CompanionCollectionList = await require("../../data/companions.json");
        console.log("Default: ");
        console.log(JSON.stringify(defaultCompanionList));
        return Promise.resolve(defaultCompanionList);
    }
}
