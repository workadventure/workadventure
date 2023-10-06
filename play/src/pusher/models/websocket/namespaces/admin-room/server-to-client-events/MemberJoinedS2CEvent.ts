import { z } from "zod";

export const MemberJoinedS2CEvent = z.object({
    uuid: z.string(),
    name: z.string(),
    ipAddress: z.string(),
    roomId: z.string(),
});

export type MemberJoinedS2CEvent = z.infer<typeof MemberJoinedS2CEvent>;
