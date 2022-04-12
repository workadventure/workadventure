import { z } from "zod";

export const isOpenCoWebsiteEvent = z.object({
    url: z.string(),
    allowApi: z.optional(z.boolean()),
    allowPolicy: z.optional(z.string()),
    widthPercent: z.optional(z.number()),
    position: z.optional(z.number()),
    closable: z.optional(z.boolean()),
    lazy: z.optional(z.boolean()),
});

export const isCoWebsite = z.object({
    id: z.string(),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type OpenCoWebsiteEvent = z.infer<typeof isOpenCoWebsiteEvent>;
