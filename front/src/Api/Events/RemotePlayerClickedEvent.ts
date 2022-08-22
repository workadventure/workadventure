import { z } from "zod";

export const isRemotePlayerClickedEvent = z.object({
    id: z.number(),
});

/**
 * A message sent from the game to the iFrame when RemotePlayer is clicked.
 */
export type RemotePlayerClickedEvent = z.infer<typeof isRemotePlayerClickedEvent>;

export type RemotePlayerClickedEventCallback = (event: RemotePlayerClickedEvent) => void;
