//The list of all the player textures, both the default models and the partial textures used for customization

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

enum PlayerTexturesKey {
    Accessory = "accessory",
    Body = "body",
    Clothes = "clothes",
    Eyes = "eyes",
    Hair = "hair",
    Hat = "hat",
    Woka = "woka",
}

type PlayerTexturesMetadata = Record<PlayerTexturesKey, PlayerTexturesCategory>;

interface PlayerTexturesCategory {
    collections: PlayerTexturesCollection[];
    required?: boolean;
}

interface PlayerTexturesCollection {
    name: string;
    textures: PlayerTexturesRecord[];
}

interface PlayerTexturesRecord {
    id: string;
    name: string;
    url: string;
}

export class PlayerTextures {
    public static PLAYER_RESOURCES: BodyResourceDescriptionListInterface;
    public static COLOR_RESOURCES: BodyResourceDescriptionListInterface;
    public static EYES_RESOURCES: BodyResourceDescriptionListInterface;
    public static HAIR_RESOURCES: BodyResourceDescriptionListInterface;
    public static CLOTHES_RESOURCES: BodyResourceDescriptionListInterface;
    public static HATS_RESOURCES: BodyResourceDescriptionListInterface;
    public static ACCESSORIES_RESOURCES: BodyResourceDescriptionListInterface;
    public static LAYERS: BodyResourceDescriptionListInterface[];

    public loadPlayerTexturesMetadata(metadata: PlayerTexturesMetadata): void {
        this.mapTexturesMetadataIntoResources(metadata);
    }

    private mapTexturesMetadataIntoResources(metadata: PlayerTexturesMetadata): void {
        PlayerTextures.PLAYER_RESOURCES = this.getMappedResources(metadata.woka);
        PlayerTextures.COLOR_RESOURCES = this.getMappedResources(metadata.body);
        PlayerTextures.EYES_RESOURCES = this.getMappedResources(metadata.eyes);
        PlayerTextures.HAIR_RESOURCES = this.getMappedResources(metadata.hair);
        PlayerTextures.CLOTHES_RESOURCES = this.getMappedResources(metadata.clothes);
        PlayerTextures.HATS_RESOURCES = this.getMappedResources(metadata.hat);
        PlayerTextures.ACCESSORIES_RESOURCES = this.getMappedResources(metadata.accessory);

        PlayerTextures.LAYERS = [
            PlayerTextures.COLOR_RESOURCES,
            PlayerTextures.EYES_RESOURCES,
            PlayerTextures.HAIR_RESOURCES,
            PlayerTextures.CLOTHES_RESOURCES,
            PlayerTextures.HATS_RESOURCES,
            PlayerTextures.ACCESSORIES_RESOURCES,
        ];
    }

    private getMappedResources(category: PlayerTexturesCategory): BodyResourceDescriptionListInterface {
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
