import { EntityPrefab, EntityRawPrefab } from "@workadventure/map-editor";

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
    private entitiesPrefabsMapPromise!: Promise<Map<string, EntityPrefab>>;
    private tags: string[] = [];

    private filter = "";
    private currentCollection: EntityCollection = { collectionName: "All Object Collection", collection: [], tags: [] };

    constructor() {}

    public getEntitiesPrefabs(): EntityPrefab[] {
        return this.entitiesPrefabs;
    }

    public getEntitiesPrefabsMap(): Promise<Map<string, EntityPrefab>> {
        return this.entitiesPrefabsMapPromise;
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

    public loadCollections(urls: string[]): void {
        this.entitiesPrefabsMapPromise = new Promise<Map<string, EntityPrefab>>((resolve, reject) => {
            const entityCollections: { collection: EntityCollection; url: string }[] = [];
            const fetchUrlPromises: Promise<EntityCollectionRaw>[] = [];
            for (const url of urls) {
                const promise = this.fetchRawCollection(url);
                fetchUrlPromises.push(promise);
                promise
                    .then((entityCollectionRaw) => {
                        entityCollections.push({
                            collection: this.parseRawCollection(entityCollectionRaw),
                            url,
                        });
                    })
                    .catch((error) => console.error(error));
            }

            Promise.all(fetchUrlPromises)
                .then(() => {
                    for (const { collection, url } of entityCollections) {
                        const tagSet = new Set<string>();
                        collection.collection.forEach((entity: EntityPrefab) => {
                            this.currentCollection.collection.push({
                                name: entity.name,
                                id: entity.id,
                                collectionName: entity.collectionName,
                                depthOffset: entity.depthOffset ?? 0,
                                tags: [...entity.tags, ...collection.tags],
                                imagePath: new URL(entity.imagePath, url).toString(),
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

                    const prefabsMap = new Map<string, EntityPrefab>();
                    for (const prefab of this.entitiesPrefabs) {
                        prefabsMap.set(prefab.id, prefab);
                    }
                    resolve(prefabsMap);
                })
                .catch((err) => {
                    console.error(err);
                });
        });
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
