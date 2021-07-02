import * as tg from "generic-type-guard";

export const isInitEvent =
    new tg.IsInterface().withProperties({
        variables: tg.isObject
    }).get();
/**
 * A message sent from the game just after an iFrame opens, to send all important data (like variables)
 */
export type InitEvent = tg.GuardedType<typeof isInitEvent>;
