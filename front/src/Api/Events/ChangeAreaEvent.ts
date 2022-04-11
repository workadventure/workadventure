import * as tg from "generic-type-guard";

export const isChangeAreaEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
    })
    .get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone.
 */
export type ChangeAreaEvent = tg.GuardedType<typeof isChangeAreaEvent>;
