import { z } from "zod";

export const isLeaveMucEvent = z.object({
    url: z.string(),
});

export type LeaveMucEvent = z.infer<typeof isLeaveMucEvent>;
