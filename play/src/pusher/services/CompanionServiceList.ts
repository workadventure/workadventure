import type { CompanionList } from "../../messages/JsonMessages/CompanionTextures";

/**
 * Services that can retrieve the list of companions
 */
export interface CompanionServiceList {
    getCompanionList(roomUrl: string, token: string): Promise<CompanionList | undefined>;
}
