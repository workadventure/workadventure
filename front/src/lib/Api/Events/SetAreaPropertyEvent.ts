import { z } from "zod";

export const isSetAreaPropertyEvent = z.object({
    areaName: z.string(),
    propertyName: z.string(),
    propertyValue: z.optional(z.union([z.string(), z.number(), z.boolean()])),
});

/**
 * A message sent from the iFrame to the game to change the value of the property of the area
 */
export type SetAreaPropertyEvent = z.infer<typeof isSetAreaPropertyEvent>;
