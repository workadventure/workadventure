import { z } from "zod";

export const BlockMessage = z.object({
    type: z.literal("blocked"),
});

export type BlockMessage = z.infer<typeof BlockMessage>;
