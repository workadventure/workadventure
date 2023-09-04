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
  klaxoonToolActivated: z.boolean().optional().default(false),
  youtubeToolActivated: z.boolean().optional().default(false),
  googleDocsToolActivated: z.boolean().optional().default(false),
  googleSheetsToolActivated: z.boolean().optional().default(false),
  googleSlidesToolActivated: z.boolean().optional().default(false),
  eraserToolActivated: z.boolean().optional().default(false),
  klaxoonToolClientId: z.string().optional(),
});

export type UserData = z.infer<typeof isUserData>;
