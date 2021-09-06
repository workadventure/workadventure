import * as tg from "generic-type-guard";

export const isEnterLeaveEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
    })
    .get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone marked with the "zone" property.
 */
export type EnterLeaveEvent = tg.GuardedType<typeof isEnterLeaveEvent>;
