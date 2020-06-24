import * as tg from "generic-type-guard";
import {isPointInterface} from "./PointInterface";

export const isJoinRoomMessageInterface =
    new tg.IsInterface().withProperties({
        roomId: tg.isString,
        position: isPointInterface,
    }).get();
export type JoinRoomMessageInterface = tg.GuardedType<typeof isJoinRoomMessageInterface>;
