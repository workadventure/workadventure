
import * as tg from "generic-type-guard";
export const updateTile = "updateTile"


export const isUpdateTileEvent =
    new tg.IsInterface().withProperties({
        x: tg.isNumber,
        y: tg.isNumber,
        tile: tg.isNumber
    }).get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone marked with the "zone" property.
 */
export type UpdateTileEvent = tg.GuardedType<typeof isUpdateTileEvent>;