import * as tg from "generic-type-guard";

export const isMenuItemRegisterEvent =
    new tg.IsInterface().withProperties({
        menutItem: tg.isString
    }).get();
/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone marked with the "zone" property.
 */
export type MenuItemRegisterEvent = tg.GuardedType<typeof isMenuItemRegisterEvent>;
