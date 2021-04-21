import * as tg from "generic-type-guard";

export const isGameStateEvent =
    new tg.IsInterface().withProperties({
        roomId: tg.isString,
        data:tg.isObject
    }).get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone marked with the "zone" property.
 */
export type GameStateEvent = tg.GuardedType<typeof isGameStateEvent>;