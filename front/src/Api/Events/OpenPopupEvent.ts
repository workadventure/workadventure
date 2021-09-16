import * as tg from "generic-type-guard";

const isButtonDescriptor = new tg.IsInterface()
    .withProperties({
        label: tg.isString,
        className: tg.isOptional(tg.isString),
    })
    .get();

export const isOpenPopupEvent = new tg.IsInterface()
    .withProperties({
        popupId: tg.isNumber,
        targetObject: tg.isString,
        message: tg.isString,
        buttons: tg.isArray(isButtonDescriptor),
    })
    .get();

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type OpenPopupEvent = tg.GuardedType<typeof isOpenPopupEvent>;
