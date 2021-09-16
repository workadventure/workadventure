import * as tg from "generic-type-guard";

export const isButtonClickedEvent = new tg.IsInterface()
    .withProperties({
        popupId: tg.isNumber,
        buttonId: tg.isNumber,
    })
    .get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone marked with the "zone" property.
 */
export type ButtonClickedEvent = tg.GuardedType<typeof isButtonClickedEvent>;
