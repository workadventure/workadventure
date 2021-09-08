import * as tg from "generic-type-guard";

export const isGoToPageEvent = new tg.IsInterface()
    .withProperties({
        url: tg.isString,
    })
    .get();

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type GoToPageEvent = tg.GuardedType<typeof isGoToPageEvent>;
