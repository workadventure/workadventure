import fs from "fs/promises";
import type { CompanionTextureCollection, CompanionDetail } from "@workadventure/messages";
import type { CompanionServiceInterface } from "./CompanionServiceInterface";

/**
 * Companion Service list that the default list of companions
 */
class LocalCompanionService implements CompanionServiceInterface {
    private async loadCompanionData(): Promise<CompanionTextureCollection[]> {
        try {
            const file = new URL("../data/companions.json", import.meta.url);
            const content = await fs.readFile(file, "utf8");
            return JSON.parse(content) as CompanionTextureCollection[];
        } catch {
            throw new Error("Failed to load Companion data");
        }
    }

    async getCompanionList(roomUrl: string, token: string): Promise<CompanionTextureCollection[] | undefined> {
        const companionList: CompanionTextureCollection[] = await this.loadCompanionData();
        if (!companionList) {
            return undefined;
        }
        return companionList;
    }

    async fetchCompanionDetails(textureId: string): Promise<CompanionDetail | undefined> {
        const companionList: CompanionTextureCollection[] = await this.loadCompanionData();

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
