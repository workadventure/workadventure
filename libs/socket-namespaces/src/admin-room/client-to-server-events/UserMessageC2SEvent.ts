import { extendApi } from "@anatine/zod-openapi";
import { z } from "zod";

export const BanBannedUserMessageC2SEvent = z.object({
    type: z.enum(["ban", "banned"]),
    message: z.string(),
    userUuid: z.string(),
});

export const UserMessageC2SEvent = z.object({
    message: extendApi(BanBannedUserMessageC2SEvent),
    world: z.string(),
});

export type BanBannedUserMessageC2SEvent = z.infer<typeof BanBannedUserMessageC2SEvent>;
export type UserMessageC2SEvent = z.infer<typeof UserMessageC2SEvent>;
