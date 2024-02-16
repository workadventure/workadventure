import {
    EntityCollection,
    EntityCollectionRaw,
    EntityPrefab,
    EntityPrefabType,
    EntityRawPrefab,
} from "@workadventure/map-editor";
import { derived, Readable, Writable, writable } from "svelte/store";
import { EntityVariant } from "./Entities/EntityVariant";

export class EntitiesCollectionsManager {
    private entitiesPrefabsMapPromise!: Promise<Map<string, EntityPrefab>>;
    private tags: string[] = [];

    private filter = "";
    private currentCollection: EntityCollection = { collectionName: "All Object Collection", collection: [], tags: [] };
    private readonly entitiesPrefabsStore: Writable<EntityPrefab[]>;
    private readonly entitiesPrefabsVariantStore: Readable<EntityVariant[]>;

    constructor() {
        this.entitiesPrefabsStore = writable([]);
        this.entitiesPrefabsVariantStore = derived(this.entitiesPrefabsStore, ($entitiesPrefabsStore) => {
            // entityVariants ordered by collectionName+name
            const entityVariants = new Map<string, EntityVariant>();
            for (const entityPrefab of $entitiesPrefabsStore) {
                const fullName = entityPrefab.collectionName + "__" + entityPrefab.name;
                let variant = entityVariants.get(fullName);
                if (variant === undefined) {
                    variant = new EntityVariant(entityPrefab);
                    entityVariants.set(fullName, variant);
                } else {
                    variant.addPrefab(entityPrefab);
                }
            }
            return [...entityVariants.values()];
        });
    }

    public getEntitiesPrefabsVariantStore(): Readable<EntityVariant[]> {
        return this.entitiesPrefabsVariantStore;
    }

    public async getEntityPrefab(collectionName: string, entityPrefabId: string): Promise<EntityPrefab | undefined> {
        const prefabsMap = await this.entitiesPrefabsMapPromise;
        return prefabsMap.get(entityPrefabId);
    }

    public loadCollections(collectionDescriptors: { url: string; type: EntityPrefabType }[]): void {
        this.entitiesPrefabsMapPromise = new Promise<Map<string, EntityPrefab>>((resolve, reject) => {
            const entityCollections: { collection: EntityCollection; url: string }[] = [];
            const fetchUrlPromises: Promise<EntityCollectionRaw>[] = [];
            for (const descriptor of collectionDescriptors) {
                const promise = this.fetchRawCollection(descriptor.url);
                fetchUrlPromises.push(promise);
                promise
                    .then((entityCollectionRaw) => {
                        console.debug(entityCollectionRaw);
                        entityCollections.push({
                            collection: this.parseRawCollection(entityCollectionRaw, descriptor.type),
                            url: descriptor.url,
                        });
                    })
                    .catch((error) => console.warn(error));
            }

            //TODO check tagSet and this.currentCollection
            Promise.allSettled(fetchUrlPromises)
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
                                type: entity.type,
                            });
                            entity.tags.forEach((tag: string) => tagSet.add(tag));
                        });

                        const tags = [...new Set([...tagSet, ...this.tags])];
                        tags.sort();
                        this.tags = tags;
                    }
                    this.entitiesPrefabsStore.set(this.currentCollection.collection);

                    const prefabsMap = new Map<string, EntityPrefab>();
                    for (const prefab of this.currentCollection.collection) {
                        prefabsMap.set(prefab.id, prefab);
                    }
                    resolve(prefabsMap);
                })
                .catch((error) => {
                    console.error(error);
                    reject(error);
                });
        });
    }

    public addUploadedEntity(uploadedEntity: EntityRawPrefab, customEntityCollectionUrl: string) {
        const uploadedEntityPrefab: EntityPrefab = {
            ...this.parseRawEntityPrefab("custom entities", uploadedEntity, "Custom"),
            imagePath: new URL(uploadedEntity.imagePath, customEntityCollectionUrl).toString(),
        };
        this.currentCollection.collection.push(uploadedEntityPrefab);

        const entitiesPrefabsMapPromiseWithUploadedEntity = new Promise<Map<string, EntityPrefab>>(
            (resolve, reject) => {
                this.entitiesPrefabsMapPromise
                    .then((existingEntitiesPrefabsMap) => {
                        existingEntitiesPrefabsMap.set(uploadedEntityPrefab.id, uploadedEntityPrefab);
                        resolve(existingEntitiesPrefabsMap);
                    })
                    .catch((error) => {
                        console.error(error);
                        reject(error);
                    });
            }
        );
        this.entitiesPrefabsStore.update((currentEntitiesPrefabs) => [...currentEntitiesPrefabs, uploadedEntityPrefab]);
        this.entitiesPrefabsMapPromise = entitiesPrefabsMapPromiseWithUploadedEntity;
    }

    private async fetchRawCollection(url: string): Promise<EntityCollectionRaw> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        } else if (
            response.headers.get("Content-Type") !== "application/json" &&
            !response.headers.get("Content-Type")?.startsWith("application/json;")
        ) {
            throw new Error(`Failed to fetch ${url}: invalid content type`);
        }
        return response.json();
    }

    private parseRawCollection(
        rawCollection: EntityCollectionRaw,
        rawCollectionType: EntityPrefabType
    ): EntityCollection {
        return {
            collectionName: rawCollection.collectionName,
            tags: [...rawCollection.tags],
            collection: rawCollection.collection.map((rawPrefab: EntityRawPrefab) =>
                this.parseRawEntityPrefab(rawCollection.collectionName, rawPrefab, rawCollectionType)
            ),
        };
    }

    private parseRawEntityPrefab(
        collectionName: string,
        rawPrefab: EntityRawPrefab,
        entityPrefabType: EntityPrefabType
    ): EntityPrefab {
        return {
            ...rawPrefab,
            collectionName,
            id: `${collectionName}:${rawPrefab.name}:${rawPrefab.color}:${rawPrefab.direction}`,
            type: entityPrefabType,
        };
    }
}
