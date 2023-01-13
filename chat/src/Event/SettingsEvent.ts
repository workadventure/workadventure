import { z } from "zod";

export const isSettings = z.object({
    notification: z.boolean(),
    chatSounds: z.boolean(),
    enableChat: z.boolean(),
    enableChatUpload: z.boolean(),
    enableChatOnlineList: z.boolean(),
    enableChatDisconnectedList: z.boolean(),
});

export type SettingsEvent = z.infer<typeof isSettings>;
