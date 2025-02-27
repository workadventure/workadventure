import { z } from "zod";

export const isWamMapDataEvent = z.object({
    data: z.unknown(),
});

/**
 * A message sent from the game to the iFrame with the content of the WAM file. We don't type the content of the WAM file for performance reasons.
 */
export type MapDataEvent = z.infer<typeof isWamMapDataEvent>;
