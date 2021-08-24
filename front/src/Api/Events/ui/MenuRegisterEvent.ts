import * as tg from "generic-type-guard";

/**
 * A message sent from a script to the game to add a new button in the menu.
 */
export const isMenuItemRegisterEvent = new tg.IsInterface()
    .withProperties({
        menuItem: tg.isString,
    })
    .get();

export type MenuItemRegisterEvent = tg.GuardedType<typeof isMenuItemRegisterEvent>;

export const isMenuItemRegisterIframeEvent = new tg.IsInterface()
    .withProperties({
        type: tg.isSingletonString("registerMenuCommand"),
        data: isMenuItemRegisterEvent,
    })
    .get();

/**
 * A message sent from a script to the game to add an iframe submenu in the menu.
 */
export const isMenuIframeEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
        url: tg.isString,
    })
    .get();

export type MenuIframeRegisterEvent = tg.GuardedType<typeof isMenuIframeEvent>;

/**
 * A message sent from a script to the game to remove a custom menu from the menu
 */
export const isUnregisterMenuEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
    })
    .get();

export type UnregisterMenuEvent = tg.GuardedType<typeof isUnregisterMenuEvent>;
