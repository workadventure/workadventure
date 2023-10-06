import { z } from "zod";

export const isItemEventMessageInterface = z.object({
    itemId: z.number(),
    event: z.string(),
    state: z.unknown(),
    parameters: z.unknown(),
});

export type ItemEventMessageInterface = z.infer<typeof isItemEventMessageInterface>;
