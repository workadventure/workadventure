import * as tg from "generic-type-guard";

export const isHasPlayerMovedEvent = new tg.IsInterface()
    .withProperties({
        direction: tg.isElementOf("right", "left", "up", "down"),
        moving: tg.isBoolean,
        x: tg.isNumber,
        y: tg.isNumber,
        oldX: tg.isOptional(tg.isNumber),
        oldY: tg.isOptional(tg.isNumber),
    })
    .get();

/**
 * A message sent from the game to the iFrame to notify a movement from the current player.
 */
export type HasPlayerMovedEvent = tg.GuardedType<typeof isHasPlayerMovedEvent>;

export type HasPlayerMovedEventCallback = (event: HasPlayerMovedEvent) => void;
