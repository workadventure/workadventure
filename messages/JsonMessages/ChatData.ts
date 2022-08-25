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
});

export type UserData = z.infer<typeof isUserData>;
