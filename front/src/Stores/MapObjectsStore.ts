import type { Readable, Subscriber, Unsubscriber, Writable } from "svelte/store";
import { get, readable, writable } from "svelte/store";

export class MapObjectVariant
{
    public itemPath: string ="";
    public itemName: string ="";
    public color: string = "";
    public direction: Direction = Direction.none;
}

export class MapObject
{
    public itemName: string ="";
    public directionVariants: DirectionVariant[] = [];

}

class DirectionVariant
{
    public direction:Direction = Direction.none;
    public colorVariants : ColorVariant[]=[];
}

class ColorVariant
{
    public color:string = "";
    public itemPath:string="";
}

enum Direction{
    left,
    up,
    down,
    right,
    none
}

export class MapObjectsStore implements Readable<MapObject[]>
{
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
    private mapObjectsStore = writable<MapObject[]>([]);

    private mapObjects: MapObject[]=[];
    constructor()
    {
        const folder = "/src/Components/images/objects/";
        for(var object of this.objectPath)
        {
            this.mapObjects.push(
                {
                    itemName:object,
                    itemPath:folder+object+".png"
                });

            for(let i = 0; i < 10 ; i++)
            {
                this.mapObjects.push(
                    {
                        itemName:object+i,
                        itemPath:folder+object+".png"
                    });
            }
       }
        this.mapObjectsStore.set(this.mapObjects);
    }

    subscribe(run: Subscriber<MapObject[]>, invalidate?: ((value?: MapObject[] | undefined) => void) | undefined): Unsubscriber {
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