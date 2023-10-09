import { z } from "zod";

export const MemberLeftS2CEvent = z.object({
    uuid: z.string(),
});

export type MemberLeftS2CEvent = z.infer<typeof MemberLeftS2CEvent>;
