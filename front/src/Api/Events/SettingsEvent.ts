import { z } from "zod";

export const isSettingsEvent = z.object({
    notification: z.boolean(),
    chatSounds: z.boolean(),
});

export type SettingsEvent = z.infer<typeof isSettingsEvent>;
