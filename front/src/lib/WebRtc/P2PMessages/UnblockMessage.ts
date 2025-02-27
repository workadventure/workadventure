import { z } from "zod";

export const UnblockMessage = z.object({
    type: z.literal("unblocked"),
});

export type UnblockMessage = z.infer<typeof UnblockMessage>;
