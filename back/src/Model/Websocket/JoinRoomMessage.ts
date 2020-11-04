import * as tg from "generic-type-guard";
import {isPointInterface} from "./PointInterface";
import {isViewport} from "./ViewportMessage";

export const isJoinRoomMessageInterface =
    new tg.IsInterface().withProperties({
        roomId: tg.isString,
        position: isPointInterface,
        viewport: isViewport
    }).get();
export type JoinRoomMessageInterface = tg.GuardedType<typeof isJoinRoomMessageInterface>;
