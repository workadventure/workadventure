import { z } from "zod";

export const isSetTilesEvent = z.array(
    z.object({
        x: z.number(),
        y: z.number(),
        tile: z.union([z.number(), z.string(), z.null()]),
        layer: z.string(),
    })
);

/**
 * A message sent from the iFrame to the game to set one or many tiles.
 */
export type SetTilesEvent = z.infer<typeof isSetTilesEvent>;
