import { z } from "zod";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isRoomRedirect = z.object({
  redirectUrl: z.string(),
});

export type RoomRedirect = z.infer<typeof isRoomRedirect>;
