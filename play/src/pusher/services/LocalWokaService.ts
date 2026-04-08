import fs from "node:fs/promises";
import type { WokaDetail, WokaList } from "@workadventure/messages";
import { wokaPartNames } from "@workadventure/messages";
import type { WokaServiceInterface } from "./WokaServiceInterface";

class LocalWokaService implements WokaServiceInterface {
    private async loadWokaData(): Promise<WokaList> {
        try {
            const file = new URL("../data/woka.json", import.meta.url);
            const content = await fs.readFile(file, "utf8");
            return JSON.parse(content) as WokaList;
        } catch {
            throw new Error("Failed to load Woka data");
        }
    }

    /**
     * Returns the list of all available Wokas & Woka Parts for the current user.
     */
    async getWokaList(roomUrl: string, token: string): Promise<WokaList | undefined> {
        const wokaData: WokaList = await this.loadWokaData();
        if (!wokaData) {
            return undefined;
        }
        return wokaData;
    }

    /**
     * Returns the URL of all the images for the given texture ids.
     *
     * Key: texture id
     * Value: URL
     *
     * If one of the textures cannot be found, undefined is returned (and the user should be redirected to Woka choice page!)
     */
    async fetchWokaDetails(textureIds: string[]): Promise<WokaDetail[] | undefined> {
        const wokaData: WokaList = await this.loadWokaData();
        const textures = new Map<string, string>();
        const searchIds = new Set(textureIds);

        for (const part of wokaPartNames) {
            const wokaPartType = wokaData[part];
            if (!wokaPartType) {
                continue;
            }

            for (const collection of wokaPartType.collections) {
                for (const id of searchIds) {
                    const texture = collection.textures.find((texture) => texture.id === id);

                    if (texture) {
                        textures.set(id, texture.url);
                        searchIds.delete(id);
                    }
                }
            }
        }

        if (textureIds.length !== textures.size) {
            return undefined;
        }

        const details: WokaDetail[] = [];

        textures.forEach((value, key) => {
            details.push({
                id: key,
                url: value,
            });
        });

        return details;
    }
}

export const localWokaService = new LocalWokaService();
