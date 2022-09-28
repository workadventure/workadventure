import type {CompanionServiceList} from "./CompanionServiceList";
import type {CompanionList} from "../../messages/JsonMessages/CompanionTextures";

/**
 * Companion Service list that the default list of companions
 */
export class LocalCompanionSevice implements CompanionServiceList {
    async getCompanionList(roomUrl: string, token: string): Promise<CompanionList | undefined> {
        const defaultCompanionList: CompanionList = await require("../../data/companions.json");
        return Promise.resolve(defaultCompanionList);
    }
}
