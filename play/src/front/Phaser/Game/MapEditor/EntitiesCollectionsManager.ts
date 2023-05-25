import { EntityPrefab, EntityRawPrefab } from "@workadventure/map-editor";
import { TexturesHelper } from "../../Helpers/TexturesHelper";

export interface EntityCollection {
    collectionName: string;
    tags: string[];
    collection: EntityPrefab[];
}

export interface EntityCollectionRaw {
    collectionName: string;
    tags: string[];
    collection: EntityRawPrefab[];
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

    public setFilter(filter: string, isTag = false) {
        this.filter = filter;
        this.applyFilters(isTag);
    }

    private applyFilters(isTag: boolean) {
        const filters = this.filter
            .toLowerCase()
            .split(" ")
            .filter((v) => v.trim() !== "");
        let newCollection = this.currentCollection.collection;

        if (isTag) {
            newCollection = newCollection.filter((item) =>
                filters.every((word) => item.tags.some((tag) => tag.toLowerCase() === word.toLowerCase()))
            );
        } else {
            newCollection = newCollection.filter(
                (item) =>
                    filters.every((word) => item.name.toLowerCase().includes(word.toLowerCase())) ||
                    filters.every((word) => item.tags.some((tag) => tag.toLowerCase() === word.toLowerCase()))
            );
        }

        this.entitiesPrefabs = newCollection;
    }

    public async loadCollections(urls: string[]): Promise<void> {
        const entityCollections: EntityCollection[] = [];
        for (const url of urls) {
            entityCollections.push(this.parseRawCollection(await this.fetchRawCollection(url)));
            for (const entityCollection of entityCollections) {
                const tagSet = new Set<string>();
                entityCollection.collection.forEach((entity: EntityPrefab) => {
                    this.currentCollection.collection.push({
                        name: entity.name,
                        id: entity.id,
                        collectionName: entity.collectionName,
                        depthOffset: entity.depthOffset ?? 0,
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
    }

    public getTags(): string[] {
        return this.tags;
    }

    private async fetchRawCollection(url: string): Promise<EntityCollectionRaw> {
        return (await fetch(url)).json();
    }

    private parseRawCollection(rawCollection: EntityCollectionRaw): EntityCollection {
        return {
            collectionName: rawCollection.collectionName,
            tags: [...rawCollection.tags],
            collection: rawCollection.collection.map((rawPrefab) =>
                this.parseRawEntityPrefab(rawCollection.collectionName, rawPrefab)
            ),
        };
    }

    private parseRawEntityPrefab(collectionName: string, rawPrefab: EntityRawPrefab): EntityPrefab {
        return {
            ...rawPrefab,
            collectionName,
            id: `${collectionName}:${rawPrefab.name}:${rawPrefab.color}:${rawPrefab.direction}`,
        };
    }
}
