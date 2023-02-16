import { z } from "zod";

export const SpaceUser = z.object({
  uuid: z.string(),
  email: z.string().nullable().optional(),
  name: z.string(),
  playUri: z.string(),
  color: z.string(),
  woka: z.string(),
  isLogged: z.boolean(),
  availabilityStatus: z.number(),
  roomName: z.optional(z.nullable(z.string())),
  visitCardUrl: z.optional(z.nullable(z.string())),
});

export type SpaceUser = z.infer<typeof SpaceUser>;
