import { CompanionCollectionList } from "@workadventure/messages";
import type { CompanionServiceInterface } from "./CompanionServiceInterface";

/**
 * Companion Service list that the default list of companions
 */
export class LocalCompanionSevice implements CompanionServiceInterface {
    async getCompanionList(roomUrl: string, token: string): Promise<CompanionCollectionList | undefined> {
        const defaultCompanionList: CompanionCollectionList = await require("../data/companions.json");
        return Promise.resolve(defaultCompanionList);
    }
}
