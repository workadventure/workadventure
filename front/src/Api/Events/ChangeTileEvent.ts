import * as tg from "generic-type-guard";

export const isChangeTileEvent =
    new tg.IsInterface().withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        tile: tg.isUnion(tg.isNumber, tg.isString),
        layer: tg.isUnion(tg.isNumber, tg.isString)
    }).get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone marked with the "zone" property.
 */
export type ChangeTileEvent = tg.GuardedType<typeof isChangeTileEvent>;