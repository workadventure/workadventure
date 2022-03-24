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
    private PLAYER_RESOURCES: BodyResourceDescriptionListInterface = {};
    private COLOR_RESOURCES: BodyResourceDescriptionListInterface = {};
    private EYES_RESOURCES: BodyResourceDescriptionListInterface = {};
    private HAIR_RESOURCES: BodyResourceDescriptionListInterface = {};
    private CLOTHES_RESOURCES: BodyResourceDescriptionListInterface = {};
    private HATS_RESOURCES: BodyResourceDescriptionListInterface = {};
    private ACCESSORIES_RESOURCES: BodyResourceDescriptionListInterface = {};
    private LAYERS: BodyResourceDescriptionListInterface[] = [];

    public loadPlayerTexturesMetadata(metadata: WokaList): void {
        this.mapTexturesMetadataIntoResources(metadata);
    }

    public getTexturesResources(key: PlayerTexturesKey): BodyResourceDescriptionListInterface {
        switch (key) {
            case PlayerTexturesKey.Accessory:
                return this.ACCESSORIES_RESOURCES;
            case PlayerTexturesKey.Body:
                return this.COLOR_RESOURCES;
            case PlayerTexturesKey.Clothes:
                return this.CLOTHES_RESOURCES;
            case PlayerTexturesKey.Eyes:
                return this.EYES_RESOURCES;
            case PlayerTexturesKey.Hair:
                return this.HAIR_RESOURCES;
            case PlayerTexturesKey.Hat:
                return this.HATS_RESOURCES;
            case PlayerTexturesKey.Woka:
                return this.PLAYER_RESOURCES;
        }
    }

    public getLayers(): BodyResourceDescriptionListInterface[] {
        return this.LAYERS;
    }

    private mapTexturesMetadataIntoResources(metadata: WokaList): void {
        this.PLAYER_RESOURCES = this.getMappedResources(metadata.woka);
        this.COLOR_RESOURCES = this.getMappedResources(metadata.body);
        this.EYES_RESOURCES = this.getMappedResources(metadata.eyes);
        this.HAIR_RESOURCES = this.getMappedResources(metadata.hair);
        this.CLOTHES_RESOURCES = this.getMappedResources(metadata.clothes);
        this.HATS_RESOURCES = this.getMappedResources(metadata.hat);
        this.ACCESSORIES_RESOURCES = this.getMappedResources(metadata.accessory);

        this.LAYERS = [
            this.COLOR_RESOURCES,
            this.EYES_RESOURCES,
            this.HAIR_RESOURCES,
            this.CLOTHES_RESOURCES,
            this.HATS_RESOURCES,
            this.ACCESSORIES_RESOURCES,
        ];
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
}

export const OBJECTS: BodyResourceDescriptionInterface[] = [
    { id: "teleportation", img: "resources/objects/teleportation.png" },
];
