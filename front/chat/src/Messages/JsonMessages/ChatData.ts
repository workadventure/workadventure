import { z } from "zod";

export const isUserData = z.object({
  uuid: z.string(),
  email: z.optional(z.nullable(z.string())),
  name: z.string(),
  playUri: z.string(),
  authToken: z.optional(z.string()),
  color: z.string(),
  woka: z.string(),
});

export type UserData = z.infer<typeof isUserData>;
