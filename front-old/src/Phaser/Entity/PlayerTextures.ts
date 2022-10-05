//The list of all the player textures, both the default models and the partial textures used for customization

import { WokaList, WokaPartType } from "../../Messages/JsonMessages/PlayerTextures";

export interface BodyResourceDescriptionListInterface {
    [key: string]: BodyResourceDescriptionInterface;
}

export interface BodyResourceDescriptionInterface {
    id: string;
    img: string;
    level?: number;
}

/**
 * Temporary object to map layers to the old "level" concept.
 */
export const mapLayerToLevel = {
    woka: -1,
    body: 0,
    eyes: 1,
    hair: 2,
    clothes: 3,
    hat: 4,
    accessory: 5,
};

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
    private wokaResources: BodyResourceDescriptionListInterface = {};
    private colorResources: BodyResourceDescriptionListInterface = {};
    private eyesResources: BodyResourceDescriptionListInterface = {};
    private hairResources: BodyResourceDescriptionListInterface = {};
    private clothesResources: BodyResourceDescriptionListInterface = {};
    private hatsResources: BodyResourceDescriptionListInterface = {};
    private accessoriesResources: BodyResourceDescriptionListInterface = {};
    private layers: BodyResourceDescriptionListInterface[] = [];

    private wokaCollections = new Map<string, BodyResourceDescriptionInterface[]>();

    public loadPlayerTexturesMetadata(metadata: WokaList): void {
        this.mapTexturesMetadataIntoResources(metadata);
    }

    public getTexturesResources(key: PlayerTexturesKey): BodyResourceDescriptionListInterface {
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

    public getLayers(): BodyResourceDescriptionListInterface[] {
        return this.layers;
    }

    public getCollectionsKeys(): string[] {
        return Array.from(this.wokaCollections.keys());
    }

    public getWokaCollectionTextures(key: string): BodyResourceDescriptionInterface[] {
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
            this.hairResources,
            this.clothesResources,
            this.hatsResources,
            this.accessoriesResources,
        ];

        this.mapWokaCollections(metadata.woka);
    }

    private getMappedResources(category: WokaPartType): BodyResourceDescriptionListInterface {
        const resources: BodyResourceDescriptionListInterface = {};
        if (!category) {
            return {};
        }
        for (const collection of category.collections) {
            for (const texture of collection.textures) {
                resources[texture.id] = { id: texture.id, img: texture.url };
            }
        }
        return resources;
    }

    private mapWokaCollections(category: WokaPartType): void {
        if (!category) {
            return;
        }
        for (const collection of category.collections) {
            const textures: BodyResourceDescriptionInterface[] = [];
            for (const texture of collection.textures) {
                textures.push({ id: texture.id, img: texture.url });
            }
            this.wokaCollections.set(collection.name, textures);
        }
    }
}

export const OBJECTS: BodyResourceDescriptionInterface[] = [
    { id: "teleportation", img: "resources/objects/teleportation.png" },
];
