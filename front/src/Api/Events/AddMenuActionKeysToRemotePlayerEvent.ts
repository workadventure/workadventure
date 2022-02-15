import * as tg from "generic-type-guard";

export const isAddMenuActionKeysToRemotePlayerEvent = new tg.IsInterface()
    .withProperties({
        id: tg.isNumber,
        actionKeys: tg.isArray(tg.isString),
    })
    .get();

export type AddMenuActionKeysToRemotePlayerEvent = tg.GuardedType<typeof isAddMenuActionKeysToRemotePlayerEvent>;

export type AddMenuActionKeysToRemotePlayerEventCallback = (event: AddMenuActionKeysToRemotePlayerEvent) => void;
