import { z } from "zod";

export const isSettings = z.object({
    notification: z.boolean(),
    chatSounds: z.boolean(),
});

export type Settings = z.infer<typeof isSettings>;
