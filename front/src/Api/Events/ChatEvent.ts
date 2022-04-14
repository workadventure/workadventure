import { z } from "zod";

export const isChatEvent = z.object({
    message: z.string(),
    author: z.string(),
});

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type ChatEvent = z.infer<typeof isChatEvent>;
