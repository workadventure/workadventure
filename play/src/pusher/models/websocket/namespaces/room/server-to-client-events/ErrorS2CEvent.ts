import { z } from "zod";

export const ErrorS2CEvent = z.object({
    message: z.string(),
});

export type ErrorS2CEvent = z.infer<typeof ErrorS2CEvent>;
