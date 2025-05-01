import { CompanionTextureCollection, CompanionDetail } from "@workadventure/messages";
import type { CompanionServiceInterface } from "./CompanionServiceInterface";

/**
 * Companion Service list that the default list of companions
 */
class LocalCompanionService implements CompanionServiceInterface {
    async getCompanionList(roomUrl: string, token: string): Promise<CompanionTextureCollection[] | undefined> {
        // "import" does not support loading JSON files
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const companionList: CompanionTextureCollection[] = await require("../data/companions.json");
        if (!companionList) {
            return undefined;
        }
        return companionList;
    }

    async fetchCompanionDetails(textureId: string): Promise<CompanionDetail | undefined> {
        // "import" does not support loading JSON files
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const companionList: CompanionTextureCollection[] = await require("../data/companions.json");

        for (const collection of companionList) {
            const texture = collection.textures.find((texture) => texture.id === textureId);

            if (texture) {
                return {
                    id: texture.id,
                    url: texture.url,
                };
            }
        }

        return undefined;
    }
}

export const localCompanionService = new LocalCompanionService();
