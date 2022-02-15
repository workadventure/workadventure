import * as tg from "generic-type-guard";

export const isRemoveActionsMenuKeyFromRemotePlayerEvent = new tg.IsInterface()
    .withProperties({
        id: tg.isNumber,
        actionKey: tg.isString,
    })
    .get();

export type RemoveActionsMenuKeyFromRemotePlayerEvent = tg.GuardedType<
    typeof isRemoveActionsMenuKeyFromRemotePlayerEvent
>;

export type RemoveActionsMenuKeyFromRemotePlayerEventCallback = (
    event: RemoveActionsMenuKeyFromRemotePlayerEvent
) => void;
