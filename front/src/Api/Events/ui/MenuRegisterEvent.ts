import * as tg from "generic-type-guard";

/**
 * A message sent from a script to the game to remove a custom menu from the menu
 */
export const isUnregisterMenuEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
    })
    .get();

export type UnregisterMenuEvent = tg.GuardedType<typeof isUnregisterMenuEvent>;

export const isMenuRegisterOptions = new tg.IsInterface()
    .withProperties({
        allowApi: tg.isBoolean,
    })
    .get();

/**
 * A message sent from a script to the game to add a custom menu from the menu
 */
export const isMenuRegisterEvent = new tg.IsInterface()
    .withProperties({
        name: tg.isString,
        iframe: tg.isUnion(tg.isString, tg.isUndefined),
        options: isMenuRegisterOptions,
    })
    .get();

export type MenuRegisterEvent = tg.GuardedType<typeof isMenuRegisterEvent>;
