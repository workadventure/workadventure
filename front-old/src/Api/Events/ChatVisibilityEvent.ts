import { z } from "zod";

export const isChatVisibilityEvent = z.object({
    visibility: z.boolean(),
});

export type ChatVisibilityEvent = z.infer<typeof isChatVisibilityEvent>;
