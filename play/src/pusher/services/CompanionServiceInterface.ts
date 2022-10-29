import type { CompanionCollectionList } from "../../messages/JsonMessages/CompanionTextures";

/**
 * Services that can retrieve the list of companions
 */
export interface CompanionServiceInterface {
    getCompanionList(roomUrl: string, token: string): Promise<CompanionCollectionList | undefined>;
}
