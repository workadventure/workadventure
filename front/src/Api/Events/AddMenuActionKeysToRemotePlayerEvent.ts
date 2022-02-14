import * as tg from "generic-type-guard";

// TODO: Change for player Clicked, add all neccessary data
export const isAddMenuActionKeysToRemotePlayerEvent = new tg.IsInterface()
    .withProperties({
        id: tg.isNumber,
        actionKeys: tg.isArray(tg.isString),
    })
    .get();

/**
 * A message sent from the game to the iFrame when RemotePlayer ActionMenu was opened.
 */
export type AddMenuActionKeysToRemotePlayerEvent = tg.GuardedType<typeof isAddMenuActionKeysToRemotePlayerEvent>;

export type AddMenuActionKeysToRemotePlayerEventCallback = (event: AddMenuActionKeysToRemotePlayerEvent) => void;
