import { z } from "zod";
import { isMucRoomDefinition } from "@workadventure/messages";

export const isXmppSettingsMessageEvent = z.object({
    conferenceDomain: z.string(),
    rooms: z.array(isMucRoomDefinition),
    jabberId: z.string(),
    jabberPassword: z.string(),
});

export type XmppSettingsMessageEvent = z.infer<typeof isXmppSettingsMessageEvent>;
