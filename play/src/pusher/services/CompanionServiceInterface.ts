import { CompanionTextureCollection } from "@workadventure/messages";

/**
 * Services that can retrieve the list of companions
 */
export interface CompanionServiceInterface {
    getCompanionList(roomUrl: string, token: string): Promise<CompanionTextureCollection[] | undefined>;
}
