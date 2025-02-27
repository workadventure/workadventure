import { z } from "zod";

export const isCloseCoWebsite = z.object({
    id: z.optional(z.string()),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type CloseCoWebsiteEvent = z.infer<typeof isCloseCoWebsite>;
