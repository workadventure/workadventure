import { z } from "zod";

export const MessageMessage = z.object({
    type: z.literal("message"),
    message: z.string(),
});

export type MessageMessage = z.infer<typeof MessageMessage>;
