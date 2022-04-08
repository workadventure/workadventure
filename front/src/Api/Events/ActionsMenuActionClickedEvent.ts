import * as tg from "generic-type-guard";

export const isActionsMenuActionClickedEvent = new tg.IsInterface()
    .withProperties({
        id: tg.isNumber,
        actionName: tg.isString,
    })
    .get();

export type ActionsMenuActionClickedEvent = tg.GuardedType<typeof isActionsMenuActionClickedEvent>;

export type ActionsMenuActionClickedEventCallback = (event: ActionsMenuActionClickedEvent) => void;
