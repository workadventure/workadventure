import * as tg from "generic-type-guard";



export const isHasPlayerMovedEvent =
    new tg.IsInterface().withProperties({
        direction: tg.isString,
        moving: tg.isBoolean,
        x: tg.isNumber,
        y: tg.isNumber
    }).get();

/**
 * A message sent from the game to the iFrame when the player move after the iFrame send a message to the game that it want to listen to the position of the player
 */
export type HasPlayerMovedEvent = tg.GuardedType<typeof isHasPlayerMovedEvent>;


export type HasPlayerMovedEventCallback = (event: HasPlayerMovedEvent) => void
