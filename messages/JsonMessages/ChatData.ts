import { z } from "zod";

export const isUserData = z.object({
    uuid: z.string(),
    email: z.string().nullable().optional(),
    name: z.string(),
    playUri: z.string(),
    authToken: z.optional(z.string()),
    color: z.string(),
    woka: z.string(),
    isLogged: z.boolean(),
    availabilityStatus: z.number(),
    roomName: z.optional(z.nullable(z.string())),
    userRoomToken: z.optional(z.nullable(z.string())),
    visitCardUrl: z.optional(z.nullable(z.string())),
});

export type UserData = z.infer<typeof isUserData>;
