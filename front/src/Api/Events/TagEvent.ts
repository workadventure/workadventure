import * as tg from "generic-type-guard";

export const isTagEvent =
    new tg.IsInterface().withProperties({
        list: tg.isArray(tg.isString),
    }).get();
/**
 * A message sent from the iFrame to the game to show/hide a layer.
 */
export type TagEvent = tg.GuardedType<typeof isTagEvent>;