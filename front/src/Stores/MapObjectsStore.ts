import type { Readable, Subscriber, Unsubscriber, Writable } from "svelte/store";
import { get, readable, writable } from "svelte/store";
import basicCollection from "../Components/entityCollection/SampleCollection.json"

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
    private allColor =["red","black", "yellow","blue", "white"]
    private objectPath = [
        'ChairGreyDown',
        'ChairGreyUp',
        'ChairGreyLeft',
        'ChairGreyRight',
        'Plant',
        'PlantSmall',
        'PoufOrange',
        'TableBrown'
    ];
    private mapObjectsStore = writable<MapEntity[]>([]);

    private mapObjects: MapEntity[]=[];
    constructor()
    {
        const folder = "/src/Components/images/objects/";
        let collection : EntityCollection = {collectionName:basicCollection.collectionName, collection:[]};
        basicCollection.collection.forEach(entity => collection.collection.push({
            name : entity.name,
            tags : entity.tags,
            path : folder + entity.path,
            direction : Direction[<keyof typeof Direction>entity.direction],
            color : entity.color
        }));
        // for(let object of this.objectPath)
        // {
        //     for(let direction of this.allDirection)
        //     {
        //         for(let color of this.allColor)
        //         {
        //             this.mapObjects.push(
        //                 {
        //                     name:object,
        //                     path:folder+object+".png",
        //                     color: color,
        //                     direction: direction,
        //                     tags:[]
        //                 });
        //         }
        //     }
        // }
        this.mapObjectsStore.set(collection.collection);
    }

    subscribe(run: Subscriber<MapEntity[]>, invalidate?: ((value?: MapEntity[] | undefined) => void) | undefined): Unsubscriber {
        return this.mapObjectsStore.subscribe(run, invalidate);
    }

    public getObjects()
    {
        return get(this.mapObjectsStore);
    }

    public setFilter(filter: string)
    {

    }
}