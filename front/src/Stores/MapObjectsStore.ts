import type { Readable, Subscriber, Unsubscriber, Writable } from "svelte/store";
import { get, readable, writable } from "svelte/store";

export interface MapEntity
{
    itemPath: string;
    itemName: string;
    color: string;
    direction: Direction;
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
        for(let object of this.objectPath)
        {
            for(let direction of this.allDirection)
            {
                for(let color of this.allColor)
                {
                    this.mapObjects.push(
                        {
                            itemName:object,
                            itemPath:folder+object+".png",
                            color: color,
                            direction: direction
                        });
                }
            }
        }
        this.mapObjectsStore.set(this.mapObjects);
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