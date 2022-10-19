import { z } from "zod";
import { extendApi } from "@anatine/zod-openapi";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isRoomRedirect = z.object({
    redirectUrl: extendApi(z.string(), {
        description: "The WorkAdventure URL to redirect to.",
        example: "/_/global/example.com/start.json",
    }),
});

export type RoomRedirect = z.infer<typeof isRoomRedirect>;
