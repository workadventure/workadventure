import * as tg from "generic-type-guard";

export const isAddActionsMenuKeyToRemotePlayerEvent = new tg.IsInterface()
    .withProperties({
        id: tg.isNumber,
        actionKey: tg.isString,
    })
    .get();

export type AddActionsMenuKeyToRemotePlayerEvent = tg.GuardedType<typeof isAddActionsMenuKeyToRemotePlayerEvent>;

export type AddActionsMenuKeyToRemotePlayerEventCallback = (event: AddActionsMenuKeyToRemotePlayerEvent) => void;
