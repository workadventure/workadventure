import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isBannedUserInterface = z.object({
    message: z.string(),
    userUuid: z.string(),
});

export const isBannedAdminMessageInterface = z.object({
    event: z.enum(["banned"]),
    message: extendApi(isBannedUserInterface),
    world: z.string(),
    jwt: z.string(),
});

export const isListenRoomsMessageInterface = z.object({
    event: z.enum(["listen"]),
    roomIds: z.array(z.string()),
    jwt: z.string(),
});

export const isAdminMessageInterface = z.union([isBannedAdminMessageInterface, isListenRoomsMessageInterface]);

export type AdminMessageInterface = z.infer<typeof isAdminMessageInterface>;
