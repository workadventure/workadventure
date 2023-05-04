import {CompanionCollectionList} from "@workadventure/messages";

export interface CompanionResourceDescriptionInterface {
    id: string;
    img: string;
    behaviour?: "dog" | "cat";
}
export class CompanionTextures {
    private companionCollections = new Map<string, CompanionResourceDescriptionInterface[]>;

    public loadCompanionTexturesMetadata(metadata: CompanionCollectionList): void {
        this.mapTexturesMetadataIntoResources(metadata);
    }

    public getTexturesResources(): CompanionResourceDescriptionInterface[] | undefined {
        return this.companionCollections.get("default");
    }

    public getCollectionsKeys(): string[] {
        return Array.from(this.companionCollections.keys());
    }

    public getCompanionCollectionTextures(key: string): CompanionResourceDescriptionInterface[] {
        return this.companionCollections.get(key) ?? [];
    }

    public mapTexturesMetadataIntoResources(metadata: CompanionCollectionList): void {
        if(!metadata){
            return;
        }
        for (const collection of metadata.companion.collections) {
            const textures: CompanionResourceDescriptionInterface[] = [];
            for (const texture of collection.textures) {
                textures.push({ id: texture.id, img: texture.url});
                this.companionCollections.set(collection.name, textures);
            }
        }
    }
}


