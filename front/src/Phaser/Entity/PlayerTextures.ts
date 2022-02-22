//The list of all the player textures, both the default models and the partial textures used for customization

export interface BodyResourceDescriptionListInterface {
    [key: string]: BodyResourceDescriptionInterface;
}

export interface BodyResourceDescriptionInterface {
    name: string;
    img: string;
    level?: number;
}

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
    position: number;
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

    public static loadPlayerTexturesMetadata(url: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            fetch(url, {
                method: "GET",
                headers: {
                    Host: "pusher.workadventure.localhost",
                },
            })
                .then((response) => response.json())
                .then((data: PlayerTexturesMetadata) => {
                    this.mapTexturesMetadataIntoResources(data);
                    resolve(true);
                })
                .catch((reason) => {
                    reject(reason);
                });
        });
    }

    private static mapTexturesMetadataIntoResources(metadata: PlayerTexturesMetadata): void {
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

    private static getMappedResources(category: PlayerTexturesCategory): BodyResourceDescriptionListInterface {
        const resources: BodyResourceDescriptionListInterface = {};
        for (const collection of category.collections) {
            for (const texture of collection.textures) {
                resources[texture.id] = { name: texture.name, img: texture.url };
            }
        }
        return resources;
    }
}

export const OBJECTS: BodyResourceDescriptionInterface[] = [
    { name: "teleportation", img: "resources/objects/teleportation.png" },
];
