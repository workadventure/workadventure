import { z } from "zod";

export const isChangeZoneEvent = z.object({
    name: z.string(),
});

/**
 * A message sent from the game to the iFrame when a user enters or leaves a zone.
 */
export type ChangeAreaEvent = z.infer<typeof isChangeZoneEvent>;
