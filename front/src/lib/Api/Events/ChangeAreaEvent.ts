import { z } from "zod";

export const isChangeAreaEvent = z.object({
    name: z.string(),
});

/**
 * A message sent from the game to the iFrame when a user enters or leaves an area.
 */
export type ChangeAreaEvent = z.infer<typeof isChangeAreaEvent>;
