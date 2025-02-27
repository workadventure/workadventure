import { z } from "zod";

export const isOpenCoWebsiteEvent = z.object({
    url: z.string(),
    allowApi: z.boolean().optional(),
    allowPolicy: z.optional(z.string()),
    widthPercent: z.optional(z.number()),
    position: z.optional(z.number()),
    closable: z.boolean().optional(),
    lazy: z.boolean().optional(),
});

export const isCoWebsite = z.object({
    id: z.string(),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type OpenCoWebsiteEvent = z.infer<typeof isOpenCoWebsiteEvent>;
