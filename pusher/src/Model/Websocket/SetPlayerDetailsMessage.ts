import * as tg from "generic-type-guard";

export const isSetPlayerDetailsMessage =
    new tg.IsInterface().withProperties({
        name: tg.isString,
        characterLayers: tg.isArray(tg.isString)
    }).get();
export type SetPlayerDetailsMessage = tg.GuardedType<typeof isSetPlayerDetailsMessage>;
