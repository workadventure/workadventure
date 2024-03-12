import { z } from "zod";

export const isNotification = z.object({
    message: z.optional(z.string()),
});
/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type Notification = z.infer<typeof isNotification>;
