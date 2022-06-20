import { z } from "zod";

export const isUserData = z.object({
    uuid: z.string(),
    email: z.optional(z.string()),
    playUri: z.string()
});

export type UserData = z.infer<typeof isUserData>;
