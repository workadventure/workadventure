import { z } from "zod";

export const isChangeLayerEvent = z.object({
    name: z.string(),
});

/**
 * A message sent from the game to the iFrame when a user enters or leaves a layer.
 */
export type ChangeLayerEvent = z.infer<typeof isChangeLayerEvent>;
