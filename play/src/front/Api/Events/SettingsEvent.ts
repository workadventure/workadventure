import { z } from "zod";

export const isSettingsEvent = z.object({
    notification: z.boolean(),
    chatSounds: z.boolean(),
    enableChat: z.boolean(),
    enableChatUpload: z.boolean(),
});

export type SettingsEvent = z.infer<typeof isSettingsEvent>;
