import { z } from "zod";

export const isRectangle = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
});

// TODO: make a variation that is all optional (except for the name)
export type Rectangle = z.infer<typeof isRectangle>;

export const isEmbeddedWebsiteEvent = z.object({
    name: z.string(),
    url: z.optional(z.string()),
    visible: z.boolean().optional(),
    allowApi: z.boolean().optional(),
    allow: z.optional(z.string()),
    x: z.optional(z.number()),
    y: z.optional(z.number()),
    width: z.optional(z.number()),
    height: z.optional(z.number()),
    origin: z.optional(z.enum(["player", "map"])),
    scale: z.optional(z.number()),
});

/**
 * A message sent from the iFrame to the game to modify an embedded website
 */
export type ModifyEmbeddedWebsiteEvent = z.infer<typeof isEmbeddedWebsiteEvent>;

export const isCreateEmbeddedWebsiteEvent = z.object({
    name: z.string(),
    url: z.string(),
    position: isRectangle,
    visible: z.boolean().optional(),
    allowApi: z.boolean().optional(),
    allow: z.optional(z.string()),
    origin: z.optional(z.enum(["player", "map"])),
    scale: z.optional(z.number()),
});

export type CreateEmbeddedWebsiteEvent = z.infer<typeof isCreateEmbeddedWebsiteEvent>;
