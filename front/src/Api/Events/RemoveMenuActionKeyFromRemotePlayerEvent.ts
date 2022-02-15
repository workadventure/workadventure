import * as tg from "generic-type-guard";

export const isRemoveMenuActionKeyFromRemotePlayerEvent = new tg.IsInterface()
    .withProperties({
        id: tg.isNumber,
        actionKey: tg.isString,
    })
    .get();

export type RemoveMenuActionKeyFromRemotePlayerEvent = tg.GuardedType<
    typeof isRemoveMenuActionKeyFromRemotePlayerEvent
>;

export type RemoveMenuActionKeyFromRemotePlayerEventCallback = (
    event: RemoveMenuActionKeyFromRemotePlayerEvent
) => void;
