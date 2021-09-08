import * as tg from "generic-type-guard";

export const isClosePopupEvent = new tg.IsInterface()
    .withProperties({
        popupId: tg.isNumber,
    })
    .get();

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type ClosePopupEvent = tg.GuardedType<typeof isClosePopupEvent>;
