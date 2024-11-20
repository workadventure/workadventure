import { z } from "zod";

const ChatMemberData = z.object({
    uuid: z.string(),
    wokaName: z.string().optional(),
    email: z
        .string()
        .nullable()
        .transform((value) => (value === null ? undefined : value)),
    chatId: z.string().optional(),
    tags: z.string().array(),
});

export const WorldChatMembersData = z.object({
    total: z.number().min(0),
    members: z.array(ChatMemberData),
});
export type WorldChatMembersData = z.infer<typeof WorldChatMembersData>;
