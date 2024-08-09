import { z } from "zod";

export const isSendLocalChatMessageOptions = z.object({
    scope: z.literal("local"),
    author: z.string().optional(),
});

export const isSendBubbleChatMessageOptions = z.object({
    scope: z.literal("bubble"),
});

export const isSendChatMessageOptions = z.union([isSendLocalChatMessageOptions, isSendBubbleChatMessageOptions]);

export const isChatEvent = z.object({
    message: z.string(),
    options: isSendChatMessageOptions,
});

export const isAuthor = z.object({
    name: z.string(),
    active: z.boolean(),
    isMe: z.boolean(),
    jid: z.string(),
    isMember: z.boolean(),
    color: z.string().optional(),
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
    id: z.optional(z.string()),
    type: isChatMessageTypes,
    date: z.date(),
    author: z.optional(z.nullable(isAuthor)),
    name: z.optional(z.nullable(z.string())),
    targets: z.optional(z.nullable(z.array(z.nullable(z.string())))),
    text: z.optional(z.nullable(z.array(z.string()))),
});
export type ChatMessage = z.infer<typeof isChatMessage>;

/**
 * A message sent from the iFrame to the game to add a message in the chat.
 */
export type ChatEvent = z.infer<typeof isChatEvent>;
export type SendLocalChatMessageOptions = z.infer<typeof isSendLocalChatMessageOptions>;
export type SendBubbleChatMessageOptions = z.infer<typeof isSendBubbleChatMessageOptions>;
export type SendChatMessageOptions = z.infer<typeof isSendChatMessageOptions>;
