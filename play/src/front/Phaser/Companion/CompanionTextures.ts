import { CompanionCollectionList } from "@workadventure/messages";

export interface CompanionResourceDescriptionListInterface {
    [key: string]: CompanionResourceDescriptionInterface;
}
export interface CompanionResourceDescriptionInterface {
    id: string;
    img: string;
    collection?: string;
    behaviour?: "dog" | "cat";
}
export class CompanionTextures {
    private companionResources: CompanionResourceDescriptionListInterface = {};
    private companionCollections = new Map<string, CompanionResourceDescriptionInterface[]>();

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
        console.log("getCompanionCollectionTextures", key, this.companionCollections.get(key));
        return this.companionCollections.get(key) ?? [];
    }

    public mapTexturesMetadataIntoResources(metadata: CompanionCollectionList): void {
        const resources: CompanionResourceDescriptionListInterface = {};
        if (!metadata) {
            return;
        }
        for (const collection of metadata.companion.collections) {
            console.log(collection);
            const textures: CompanionResourceDescriptionInterface[] = [];
            for (const texture of collection.textures) {
                textures.push({ id: texture.id, img: texture.url, collection: collection.name });
                resources[texture.id] = { id: texture.id, img: texture.url, collection: collection.name };
                this.companionCollections.set(collection.name, textures);
            }
        }
        this.companionResources = resources;
    }

    // // @ts-ignore
    // public getCompanionResourceById(id: string | null): CompanionResourceDescriptionInterface[] {
    //     const currentResources = Object.values(this.companionResources);
    //     // @ts-ignore
    //     currentResources.forEach((companion)=>{
    //         if(companion.id === id){
    //             if(companion.collection){
    //                 return this.getCompanionCollectionTextures(companion.collection);
    //             }
    //         }
    //     })
    // }
    public getCompanionResourceById(id: string): CompanionResourceDescriptionInterface {
        return this.companionResources[id];
    }
    public getCompanionResources(): CompanionResourceDescriptionListInterface {
        return this.companionResources;
    }
}
