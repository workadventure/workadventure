import { CompanionTextureCollection, CompanionTexture } from "@workadventure/messages";

export interface CompanionTextureByIdList {
    [key: string]: CompanionTexture;
}

export interface CompanionTextureDescriptionInterface {
    id: string;
    url: string;
}

export class CompanionTextures {
    private companionResources: CompanionTextureByIdList = {};
    private companionCollections = new Map<string, CompanionTexture[]>();

    public loadCompanionTexturesMetadata(metadata: CompanionTextureCollection[]): void {
        this.mapTexturesMetadataIntoResources(metadata);
    }

    public getCollectionsKeys(): string[] {
        return Array.from(this.companionCollections.keys());
    }

    public getCompanionCollectionTextures(key: string): CompanionTexture[] {
        return this.companionCollections.get(key) ?? [];
    }

    public mapTexturesMetadataIntoResources(collections: CompanionTextureCollection[]): void {
        const resources: CompanionTextureByIdList = {};
        for (const collection of collections) {
            const textures: CompanionTexture[] = [];
            for (const texture of collection.textures) {
                textures.push(texture);
                resources[texture.id] = texture;
                this.companionCollections.set(collection.name, textures);
            }
        }
        this.companionResources = resources;
    }
    public getCompanionResourceById(id: string): CompanionTexture {
        return this.companionResources[id];
    }

    public getCompanionCollectionAndIndexByCompanionId(id: string): [string, number] | undefined {
        for (const [key, value] of this.companionCollections.entries()) {
            for (let i = 0; i < value.length; i++) {
                return [key, i];
            }
        }
        return undefined;
    }

    public getCompanionResources(): CompanionTextureByIdList {
        return this.companionResources;
    }
}
