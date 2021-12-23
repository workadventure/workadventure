import * as tg from "generic-type-guard";

/*
 * WARNING! The original file is in /messages/JsonMessages.
 * All other files are automatically copied from this file on container startup / build
 */

export const isRoomRedirect = new tg.IsInterface()
    .withProperties({
        redirectUrl: tg.isString,
    })
    .get();
export type RoomRedirect = tg.GuardedType<typeof isRoomRedirect>;
