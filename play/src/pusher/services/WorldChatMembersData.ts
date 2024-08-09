import { z } from "zod";

const ChatMemberData = z.object({
    uuid: z.string(),
    wokaName: z.string().optional(),
    email: z.string().optional(),
    chatId: z.string().optional(),
    tags: z.string().array(),
});

export const WorldChatMembersData = z.object({
    total: z.number().positive(),
    members: z.array(ChatMemberData),
});
export type WorldChatMembersData = z.infer<typeof WorldChatMembersData>;
