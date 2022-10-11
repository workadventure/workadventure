import { z } from "zod";

export const isRoomRedirect = z.object({
    redirectUrl: z.string(),
});

export type RoomRedirect = z.infer<typeof isRoomRedirect>;
