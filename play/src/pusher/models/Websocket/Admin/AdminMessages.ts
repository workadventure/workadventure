import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isBannedAdminMessageInterface = z.object({
    type: z.enum(["banned"]),
    message: z.string(),
    userUuid: z.string(),
});

export const isUserMessageAdminMessageInterface = z.object({
    event: z.enum(["user-message"]),
    message: extendApi(isBannedAdminMessageInterface),
    world: z.string(),
    jwt: z.string(),
});

export const isListenRoomsMessageInterface = z.object({
    event: z.enum(["listen"]),
    roomIds: z.array(z.string()),
    jwt: z.string(),
});

export const isAdminMessageInterface = z.union([isUserMessageAdminMessageInterface, isListenRoomsMessageInterface]);

export type AdminMessageInterface = z.infer<typeof isAdminMessageInterface>;
