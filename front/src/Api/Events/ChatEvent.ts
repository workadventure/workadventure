import * as tg from "generic-type-guard";

export const isChatEvent = new tg.IsInterface()
    .withProperties({
        message: tg.isString,
        author: tg.isString,
    })
    .get();
/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type ChatEvent = tg.GuardedType<typeof isChatEvent>;
