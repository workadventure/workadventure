import * as tg from "generic-type-guard";

export const isChangeZoneEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
    })
    .get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone.
 */
export type ChangeZoneEvent = tg.GuardedType<typeof isChangeZoneEvent>;
