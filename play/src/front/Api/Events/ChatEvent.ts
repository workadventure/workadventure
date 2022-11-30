import { z } from "zod";

export const isChatEvent = z.object({
    message: z.string(),
    author: z.string(),
});

export enum ChatMessageTypes {
    text = 1,
    me,
    userIncoming,
    userOutcoming,
    userWriting,
    userStopWriting,
}

export const isChatMessageTypes = z.nativeEnum(ChatMessageTypes);

export const isChatMessage = z.object({
    type: isChatMessageTypes,
    date: z.date(),
    author: z.optional(z.nullable(z.string())),
    name: z.optional(z.nullable(z.string())),
    targets: z.optional(z.nullable(z.array(z.nullable(z.string())))),
    text: z.optional(z.nullable(z.array(z.nullable(z.string())))),
});
export type ChatMessage = z.infer<typeof isChatMessage>;

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type ChatEvent = z.infer<typeof isChatEvent>;
