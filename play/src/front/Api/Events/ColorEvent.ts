import { z } from "zod";

export const isColorEvent = z.object({
    red: z.number(),
    green: z.number(),
    blue: z.number(),
});

/**
 * A message sent from the iFrame to the game to dynamically set the outline of the player.
 */
export type ColorEvent = z.infer<typeof isColorEvent>;
