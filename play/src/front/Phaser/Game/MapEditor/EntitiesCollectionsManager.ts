import { EntityPrefab } from "@workadventure/map-editor";
import { TexturesHelper } from "../../Helpers/TexturesHelper";

export interface EntityCollection {
    collectionName: string;
    tags: string[];
    collection: EntityPrefab[];
}

export class EntitiesCollectionsManager {
    private entitiesPrefabs: EntityPrefab[] = [];
    private tags: string[] = [];

    private filter = "";
    private currentCollection: EntityCollection = { collectionName: "All Object Collection", collection: [], tags: [] };

    constructor() {}

    public getEntitiesPrefabs(): EntityPrefab[] {
        return this.entitiesPrefabs;
    }

    public getEntityPrefab(collectionName: string, entityPrefabId: string): EntityPrefab | undefined {
        return this.entitiesPrefabs.find(
            (prefab) => prefab.collectionName === collectionName && prefab.id === entityPrefabId
        );
    }

    public setNameFilter(filter: string) {
        this.filter = filter;
        this.applyFilters();
    }

    private applyFilters() {
        const filters = this.filter
            .toLowerCase()
            .split(" ")
            .filter((v) => v.trim() !== "");
        let newCollection = this.currentCollection.collection;
        newCollection = newCollection.filter(
            (item) =>
                filters.every((word) => item.name.toLowerCase().includes(word)) ||
                filters.every((word) => item.tags.includes(word))
        );
        this.entitiesPrefabs = newCollection;
    }

    public async loadCollections(url: string): Promise<void> {
        const entityCollections = await this.fetchCollections(url);

        for (const entityCollection of entityCollections) {
            const tagSet = new Set<string>();
            entityCollection.collection.forEach((entity: EntityPrefab) => {
                this.currentCollection.collection.push({
                    name: entity.name,
                    id: entity.id,
                    collectionName: entity.collectionName,
                    depthOffset: entity.depthOffset ?? 0,
                    // TODO: Merge tags on map-storage side?
                    tags: [...entity.tags, ...entityCollection.tags],
                    imagePath: `${TexturesHelper.ENTITIES_TEXTURES_DIRECTORY}${entity.imagePath}`,
                    direction: entity.direction,
                    color: entity.color,
                    collisionGrid: entity.collisionGrid,
                });
                entity.tags.forEach((tag: string) => tagSet.add(tag));
            });

            const tags = [...new Set([...tagSet, ...this.tags])];
            tags.sort();
            this.tags = tags;
            this.entitiesPrefabs = this.currentCollection.collection;
        }
    }

    public getTags(): string[] {
        return this.tags;
    }

    private async fetchCollections(url: string): Promise<EntityCollection[]> {
        return (await fetch(url)).json();
    }
}
