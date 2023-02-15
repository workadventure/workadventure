import type { OutlineableInterface } from "../Phaser/Game/OutlineableInterface";

export function isOutlineable(object: unknown): object is OutlineableInterface {
    return (object as OutlineableInterface)?.pointerOverOutline !== undefined;
}
/**
 * Make sure Typescript does not complain about "any" type when iterating through object's properties
 * Trick explained here:
 * https://stackoverflow.com/questions/66372307/simplest-way-to-iterate-over-an-object-when-using-typescript
 * */
export function assertObjectKeys<T extends object>(obj: T): (keyof T)[] {
    return Object.keys(obj) as Array<keyof T>;
}
