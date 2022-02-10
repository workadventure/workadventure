import * as tg from "generic-type-guard";

// TODO: Change for player Clicked, add all neccessary data
export const isActionMenuClickedEvent = new tg.IsInterface()
    .withProperties({
        id: tg.isNumber,
    })
    .get();

/**
 * A message sent from the game to the iFrame when RemotePlayer ActionMenu was opened.
 */
export type ActionMenuclickedEvent = tg.GuardedType<typeof isActionMenuClickedEvent>;

export type ActionMenuclickedEventCallback = (event: ActionMenuclickedEvent) => void;
