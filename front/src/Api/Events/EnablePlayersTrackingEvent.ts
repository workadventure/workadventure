import { z } from "zod";

export const isEnablePlayersTrackingEvent = z.object({
    players: z.boolean(),
    movement: z.boolean(),
});

/**
 * A message sent from the game to the iFrame to notify the game that the iframe is interested in tracking users.
 */
export type EnablePlayersTrackingEvent = z.infer<typeof isEnablePlayersTrackingEvent>;
