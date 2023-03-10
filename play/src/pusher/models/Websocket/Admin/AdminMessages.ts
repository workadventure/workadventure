import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isBanBannedAdminMessageInterface = z.object({
    type: z.enum(["ban", "banned"]),
    message: z.string(),
    userUuid: z.string(),
});

export const isUserMessageAdminMessageInterface = z.object({
    event: z.literal("user-message"),
    message: extendApi(isBanBannedAdminMessageInterface),
    world: z.string(),
    jwt: z.string(),
});

export const isListenRoomsMessageInterface = z.object({
    event: z.literal("listen"),
    roomIds: z.array(z.string()),
    jwt: z.string(),
});

export const AdminMessageInterface = z.discriminatedUnion("event", [isUserMessageAdminMessageInterface, isListenRoomsMessageInterface]);

export type AdminMessageInterface = z.infer<typeof AdminMessageInterface>;
