import * as tg from "generic-type-guard";

// TODO: Change for player Clicked, add all neccessary data
export const isRemotePlayerClickedEvent = new tg.IsInterface()
    .withProperties({
        id: tg.isNumber,
    })
    .get();

/**
 * A message sent from the game to the iFrame when RemotePlayer is clicked.
 */
export type RemotePlayerClickedEvent = tg.GuardedType<typeof isRemotePlayerClickedEvent>;

export type RemotePlayerClickedEventCallback = (event: RemotePlayerClickedEvent) => void;
