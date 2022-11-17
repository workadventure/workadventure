import type { Readable, Subscriber, Unsubscriber, Writable } from "svelte/store";
import { get, readable, writable } from "svelte/store";
import furnitureCollection from "../Components/entityCollection/FurnitureCollection.json"
import officeCollection from "../Components/entityCollection/OfficeCollection.json"

export interface MapEntity
{
    name: string;
    tags: string[];
    path: string;
    direction: Direction;
    color: string;
}

export interface EntityCollection
{
    collectionName: string;
    collection:MapEntity[];
}

export enum Direction{
    Left = "Left",
    Up = "Up",
    Down = "Down",
    Right = "Right"
}
export class MapObjectsStore implements Readable<MapEntity[]>
{
    private allDirection =[Direction.Left, Direction.Up, Direction.Down, Direction.Right]
    private mapObjectsStore = writable<MapEntity[]>([]);

    private mapObjects: MapEntity[]=[];
    private filter:string = "";
    public tagsStore= writable<string[]>([]);
    private currentCollection:EntityCollection = {collectionName:"All Object Collection", collection:[]};

    constructor()
    {
        let allCollections = [furnitureCollection, officeCollection];
        const folder = "/src/Components/images/objects/";
        let tagSet = new Set<string>();
        allCollections.forEach(collection => {
            collection.collection.forEach(entity => {
                this.currentCollection.collection.push({
                    name : entity.name,
                    tags : [...entity.tags, ...collection.tags],
                    path : folder + entity.path,
                    direction : Direction[<keyof typeof Direction>entity.direction],
                    color : entity.color
                });
                entity.tags.forEach(tag => tagSet.add(tag));
            });
        });

        let tags = [...tagSet]
        tags.sort();
        this.tagsStore.set(tags);
        this.mapObjectsStore.set(this.currentCollection.collection);
    }

    subscribe(run: Subscriber<MapEntity[]>, invalidate?: ((value?: MapEntity[] | undefined) => void) | undefined): Unsubscriber {
        return this.mapObjectsStore.subscribe(run, invalidate);
    }

    public getObjects()
    {
        return get(this.mapObjectsStore);
    }

    public setNameFilter(filter: string)
    {
        this.filter = filter;
        this.applyFilters();
    }

    private applyFilters()
    {
        let filters = this.filter.toLowerCase().split(" ").filter(v=> v.trim()!=="");
        let newCollection = this.currentCollection.collection;
        newCollection = newCollection.filter(item => filters.every(word => item.name.toLowerCase().includes(word)) || filters.every(word => item.tags.includes(word)));
        this.mapObjectsStore.set(newCollection);
    }
}