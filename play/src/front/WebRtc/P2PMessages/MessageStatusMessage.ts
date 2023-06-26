import { z } from "zod";

export const MessageStatusMessage = z.object({
    type: z.literal("message_status"),
    message: z.union([z.literal(5), z.literal(6)]),
});

export type MessageStatusMessage = z.infer<typeof MessageStatusMessage>;
