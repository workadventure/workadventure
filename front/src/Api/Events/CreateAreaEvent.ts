import { z } from "zod";

export const isAreaEvent = z.object({
    name: z.string(),
    x: z.optional(z.number()),
    y: z.optional(z.number()),
    width: z.optional(z.number()),
    height: z.optional(z.number()),
});

/**
 * A message sent from the iFrame to the game to modify an embedded website
 */
export type ModifyAreaEvent = z.infer<typeof isAreaEvent>;

export const isCreateAreaEvent = z.object({
    name: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
});

export type CreateAreaEvent = z.infer<typeof isCreateAreaEvent>;
