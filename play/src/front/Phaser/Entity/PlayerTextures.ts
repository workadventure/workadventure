//The list of all the player textures, both the default models and the partial textures used for customization

import type { WokaList, WokaPartType } from "@workadventure/messages";

export interface WokaTextureDescriptionListInterface {
    [key: string]: WokaTextureDescriptionInterface;
}

export interface WokaTextureDescriptionInterface {
    id: string;
    url: string;
}

export enum PlayerTexturesKey {
    Accessory = "accessory",
    Body = "body",
    Clothes = "clothes",
    Eyes = "eyes",
    Hair = "hair",
    Hat = "hat",
    Woka = "woka",
}

export class PlayerTextures {
    private wokaResources: WokaTextureDescriptionListInterface = {};
    private colorResources: WokaTextureDescriptionListInterface = {};
    private eyesResources: WokaTextureDescriptionListInterface = {};
    private hairResources: WokaTextureDescriptionListInterface = {};
    private clothesResources: WokaTextureDescriptionListInterface = {};
    private hatsResources: WokaTextureDescriptionListInterface = {};
    private accessoriesResources: WokaTextureDescriptionListInterface = {};
    private layers: WokaTextureDescriptionListInterface[] = [];

    wokaCollections = new Map<string, WokaTextureDescriptionInterface[]>();

    public loadPlayerTexturesMetadata(metadata: WokaList): void {
        this.mapTexturesMetadataIntoResources(metadata);
    }

    public getTexturesResources(key: PlayerTexturesKey): WokaTextureDescriptionListInterface {
        switch (key) {
            case PlayerTexturesKey.Accessory:
                return this.accessoriesResources;
            case PlayerTexturesKey.Body:
                return this.colorResources;
            case PlayerTexturesKey.Clothes:
                return this.clothesResources;
            case PlayerTexturesKey.Eyes:
                return this.eyesResources;
            case PlayerTexturesKey.Hair:
                return this.hairResources;
            case PlayerTexturesKey.Hat:
                return this.hatsResources;
            case PlayerTexturesKey.Woka:
                return this.wokaResources;
        }
    }

    public getLayers(): WokaTextureDescriptionListInterface[] {
        return this.layers;
    }

    public getCollectionsKeys(): string[] {
        return Array.from(this.wokaCollections.keys());
    }

    public getWokaCollectionTextures(key: string): WokaTextureDescriptionInterface[] {
        return this.wokaCollections.get(key) ?? [];
    }

    private mapTexturesMetadataIntoResources(metadata: WokaList): void {
        this.wokaResources = this.getMappedResources(metadata.woka);
        this.colorResources = this.getMappedResources(metadata.body);
        this.eyesResources = this.getMappedResources(metadata.eyes);
        this.hairResources = this.getMappedResources(metadata.hair);
        this.clothesResources = this.getMappedResources(metadata.clothes);
        this.hatsResources = this.getMappedResources(metadata.hat);
        this.accessoriesResources = this.getMappedResources(metadata.accessory);

        this.layers = [
            this.colorResources,
            this.eyesResources,
            this.clothesResources,
            this.hairResources,
            this.hatsResources,
            this.accessoriesResources,
        ];

        this.mapWokaCollections(metadata.woka);
    }

    private getMappedResources(category: WokaPartType): WokaTextureDescriptionListInterface {
        const resources: WokaTextureDescriptionListInterface = {};
        if (!category) {
            return {};
        }
        for (const collection of category.collections) {
            for (const texture of collection.textures) {
                resources[texture.id] = { id: texture.id, url: texture.url };
            }
        }
        return resources;
    }

    private mapWokaCollections(category: WokaPartType): void {
        if (!category) {
            return;
        }
        for (const collection of category.collections) {
            const textures: WokaTextureDescriptionInterface[] = [];
            for (const texture of collection.textures) {
                textures.push({ id: texture.id, url: texture.url });
            }
            this.wokaCollections.set(collection.name, textures);
        }
    }
}
