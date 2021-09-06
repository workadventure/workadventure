import * as tg from "generic-type-guard";

export const isUserInputChatEvent = new tg.IsInterface()
    .withProperties({
        message: tg.isString,
    })
    .get();
/**
 * A message sent from the game to the iFrame when a user types a message in the chat.
 */
export type UserInputChatEvent = tg.GuardedType<typeof isUserInputChatEvent>;
