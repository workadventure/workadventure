import * as tg from "generic-type-guard";

export const isOpenCoWebsiteEvent = new tg.IsInterface()
    .withProperties({
        url: tg.isString,
        allowApi: tg.isOptional(tg.isBoolean),
        allowPolicy: tg.isOptional(tg.isString),
        widthPercent: tg.isOptional(tg.isNumber),
        position: tg.isOptional(tg.isNumber),
        closable: tg.isOptional(tg.isBoolean),
        lazy: tg.isOptional(tg.isBoolean),
    })
    .get();

export const isCoWebsite = new tg.IsInterface()
    .withProperties({
        id: tg.isString,
    })
    .get();

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type OpenCoWebsiteEvent = tg.GuardedType<typeof isOpenCoWebsiteEvent>;
