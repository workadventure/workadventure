import { EntityPrefab, Direction } from "@workadventure/map-editor";
import type { Readable, Subscriber, Unsubscriber } from "svelte/store";
import { get, writable } from "svelte/store";
import { TexturesHelper } from "../Phaser/Helpers/TexturesHelper";

export interface EntityCollection {
    collectionName: string;
    tags: string[];
    collection: EntityPrefab[];
}

export class MapEntitiesPrefabsStore implements Readable<EntityPrefab[]> {
    private allDirection = [Direction.Left, Direction.Up, Direction.Down, Direction.Right];
    private mapEntitiesStore = writable<EntityPrefab[]>([]);

    private mapObjects: EntityPrefab[] = [];
    private filter = "";
    public tagsStore = writable<string[]>([]);
    private currentCollection: EntityCollection = { collectionName: "All Object Collection", collection: [], tags: [] };

    constructor() {}

    subscribe(
        run: Subscriber<EntityPrefab[]>,
        invalidate?: ((value?: EntityPrefab[] | undefined) => void) | undefined
    ): Unsubscriber {
        return this.mapEntitiesStore.subscribe(run, invalidate);
    }

    public getObjects() {
        return get(this.mapEntitiesStore);
    }

    public getEntityPrefab(collectionName: string, entityPrefabId: string): EntityPrefab | undefined {
        return get(this.mapEntitiesStore).find(
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
        this.mapEntitiesStore.set(newCollection);
    }

    public loadCollection(url: string): void {
        this.fetchCollection(url)
            .then((entityCollection: EntityCollection) => {
                const tagSet = new Set<string>();
                entityCollection.collection.forEach((entity: EntityPrefab) => {
                    this.currentCollection.collection.push({
                        name: entity.name,
                        id: entity.id,
                        collectionName: entity.collectionName,
                        // TODO: Merge tags on map-storage side?
                        tags: [...entity.tags, ...entityCollection.tags],
                        imagePath: `${TexturesHelper.ENTITIES_TEXTURES_DIRECTORY}${entity.imagePath}`,
                        direction: entity.direction,
                        color: entity.color,
                        collisionGrid: entity.collisionGrid,
                    });
                    entity.tags.forEach((tag: string) => tagSet.add(tag));
                });

                const tags = [...tagSet];
                tags.sort();
                this.tagsStore.set(tags);
                this.mapEntitiesStore.set(this.currentCollection.collection);
            })
            .catch((reason) => {
                console.error(reason);
            });
    }

    private async fetchCollection(url: string): Promise<EntityCollection> {
        return (await fetch(url)).json();
    }

    // private async fetchCollections(collectionsNames: string[]): Promise<EntityCollection[]> {
    //     const promises: Promise<EntityCollection>[] = [];
    //     for (const name of collectionsNames) {
    //         // TODO: Get this url from GameScene..?
    //         promises.push((await fetch(`http://map-storage.workadventure.localhost/entityCollections/${name}`)).json());
    //     }
    //     return await Promise.all(promises);
    // }

    private async fetchCollectionsNames(): Promise<{ collections: string[] }> {
        return (await fetch("http://map-storage.workadventure.localhost/entityCollections")).json();
    }
}
