import { z } from "zod";

export const isUserInputChatEvent = z.object({
    message: z.string(),
    senderId: z
        .string()
        .optional()
        .describe("The id of the sender of the message. If not provided, the message is sent by the current user."),
});

/**
 * A message sent from the game to the iFrame when a user types a message in the chat.
 */
export type UserInputChatEvent = z.infer<typeof isUserInputChatEvent>;
