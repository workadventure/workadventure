import { z } from "zod";

export const isBanEvent = z.object({
    uuid: z.string(),
    name: z.string(),
});

export type BanEvent = z.infer<typeof isBanEvent>;
