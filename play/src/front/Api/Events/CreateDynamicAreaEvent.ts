import { z } from "zod";

export const isDynamicAreaEvent = z.object({
    name: z.string(),
    x: z.optional(z.number()),
    y: z.optional(z.number()),
    width: z.optional(z.number()),
    height: z.optional(z.number()),
});

/**
 * A message sent from the iFrame to the game to modify an embedded website
 */
export type ModifyDynamicAreaEvent = z.infer<typeof isDynamicAreaEvent>;

export const isCreateDynamicAreaEvent = z.object({
    name: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
});

export type CreateDynamicAreaEvent = z.infer<typeof isCreateDynamicAreaEvent>;
