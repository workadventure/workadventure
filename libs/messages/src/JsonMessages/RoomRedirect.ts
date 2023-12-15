import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

export const isRoomRedirect = z.object({
  redirectUrl: extendApi(z.string(), {
    description: "The WorkAdventure URL to redirect to.",
    example: "https://play.yourserver.com/_/global/example.com/start.json",
  }),
});

export type RoomRedirect = z.infer<typeof isRoomRedirect>;
