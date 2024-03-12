import { z } from "zod";

export const isChatVisibility = z.object({
    visibility: z.boolean(),
});

export type ChatVisibility = z.infer<typeof isChatVisibility>;
