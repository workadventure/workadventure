import * as tg from "generic-type-guard";

export const isChatEvent =
    new tg.IsInterface().withProperties({
        message: tg.isString,
        author: tg.isString,
    }).get();
export type ChatEvent = tg.GuardedType<typeof isChatEvent>;
