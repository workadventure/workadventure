import { z } from "zod";
import { isMucRoomDefinition } from "../Messages/JsonMessages/MucRoomDefinitionInterface";

export const isXmppSettingsMessageEvent = z.object({
    jid: z.string(),
    conferenceDomain: z.string(),
    rooms: z.array(isMucRoomDefinition),
    jabberId: z.string(),
    jabberPassword: z.string(),
});

export type XmppSettingsMessageEvent = z.infer<typeof isXmppSettingsMessageEvent>;
