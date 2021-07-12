import * as tg from "generic-type-guard";

export const isSetTilesEvent = tg.isArray(
    new tg.IsInterface()
        .withProperties({
            x: tg.isNumber,
            y: tg.isNumber,
            tile: tg.isUnion(tg.isUnion(tg.isNumber, tg.isString), tg.isNull),
            layer: tg.isString,
        })
        .get()
);
/**
 * A message sent from the iFrame to the game to set one or many tiles.
 */
export type SetTilesEvent = tg.GuardedType<typeof isSetTilesEvent>;
