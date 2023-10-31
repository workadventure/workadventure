import { z } from "zod";

export const isUpdateWritingStatusChatListEvent = z.object({
    users: z.array(
        z.object({
            jid: z.string().optional(),
            name: z.string().optional(), // Name is used as a fallback if the user has no JID (in case it is a bot)
        })
    ),
});

export type UpdateWritingStatusChatListEvent = z.infer<typeof isUpdateWritingStatusChatListEvent>;
