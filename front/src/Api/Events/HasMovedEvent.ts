import * as tg from "generic-type-guard";



export const isHasMovedEvent =
    new tg.IsInterface().withProperties({
        direction: tg.isString,
        moving: tg.isBoolean,
        x: tg.isNumber,
        y: tg.isNumber
    }).get();

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type HasMovedEvent = tg.GuardedType<typeof isHasMovedEvent>;


export type HasMovedEventCallback = (event: HasMovedEvent) => void
