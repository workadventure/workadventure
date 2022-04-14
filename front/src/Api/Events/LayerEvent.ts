import { z } from "zod";

export const isLayerEvent = z.object({
    name: z.string(),
});

/**
 * A message sent from the iFrame to the game to show/hide a layer.
 */
export type LayerEvent = z.infer<typeof isLayerEvent>;
