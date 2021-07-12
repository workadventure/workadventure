import * as tg from "generic-type-guard";

/*export interface PointInterface {
    readonly x: number;
    readonly y: number;
    readonly direction: string;
    readonly moving: boolean;
}*/

export const isPointInterface = new tg.IsInterface()
    .withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        direction: tg.isString,
        moving: tg.isBoolean,
    })
    .get();
export type PointInterface = tg.GuardedType<typeof isPointInterface>;
