import * as tg from "generic-type-guard";



const isOptions = new tg.IsInterface().withOptionalProperties({
    asOverlay: tg.isBoolean
}).get();
export type OpenCoWebSiteOptionsEvent = tg.GuardedType<typeof isOptions>;

export const isOpenCoWebsite =
    new tg.IsInterface().withProperties({
        url: tg.isString,

    }).withOptionalProperties({
        options: isOptions
    }).get();

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type OpenCoWebSiteEvent = tg.GuardedType<typeof isOpenCoWebsite>;
