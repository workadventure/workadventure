import { z } from "zod";

export const isUserInputChatEvent = z.object({
    message: z.string(),
});

/**
 * A message sent from the game to the iFrame when a user types a message in the chat.
 */
export type UserInputChatEvent = z.infer<typeof isUserInputChatEvent>;
