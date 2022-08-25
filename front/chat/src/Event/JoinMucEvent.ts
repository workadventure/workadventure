import { z } from "zod";

export const isJoinMucEvent = z.object({
    url: z.string(),
    name: z.string(),
    type: z.string(),
    subscribe: z.boolean(),
});

export type JoinMucEvent = z.infer<typeof isJoinMucEvent>;
