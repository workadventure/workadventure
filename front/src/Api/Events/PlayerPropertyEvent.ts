import * as tg from "generic-type-guard";

export const isPlayerPropertyEvent = new tg.IsInterface()
    .withProperties({
        propertyName: tg.isString,
        propertyValue: tg.isUnknown,
    })
    .get();

/**
 * A message sent from the iFrame to set player-related properties.
 */
export type PlayerPropertyEvent = tg.GuardedType<typeof isPlayerPropertyEvent>;
