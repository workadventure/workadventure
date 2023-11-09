import { z } from "zod";
import { MucRoomDefinition } from "@workadventure/messages";

export const isXmppSettingsMessageEvent = z.object({
    conferenceDomain: z.string(),
    rooms: MucRoomDefinition.array(),
    jabberId: z.string(),
    jabberPassword: z.string(),
});

export type XmppSettingsMessageEvent = z.infer<typeof isXmppSettingsMessageEvent>;
