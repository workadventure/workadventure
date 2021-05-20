import * as tg from "generic-type-guard";

export const isTilesetEvent =
    new tg.IsInterface().withProperties({
        name : tg.isString,
        imgUrl : tg.isString,
        tilewidth : tg.isNumber,
        tileheight : tg.isNumber,
        margin : tg.isNumber,
        spacing : tg.isNumber,
    }).get();
/**
 * A message sent from the iFrame to the game to show/hide a layer.
 */
export type TilesetEvent = tg.GuardedType<typeof isTilesetEvent>;