import * as tg from "generic-type-guard";

export const isCloseCoWebsite = new tg.IsInterface()
    .withProperties({
        id: tg.isOptional(tg.isString),
    })
    .get();

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type CloseCoWebsiteEvent = tg.GuardedType<typeof isCloseCoWebsite>;
