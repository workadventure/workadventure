import { z } from "zod";

export const isSetPropertyEvent = z.object({
    layerName: z.string(),
    propertyName: z.string(),
    propertyValue: z.optional(z.union([z.string(), z.number(), z.boolean()])),
});

/**
 * A message sent from the iFrame to the game to change the value of the property of the layer
 */
export type SetPropertyEvent = z.infer<typeof isSetPropertyEvent>;
